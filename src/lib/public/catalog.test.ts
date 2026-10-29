import type postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { freshDb } from "../../../test/db";
import { loadCategoryPage, loadHomeData, loadPublishedApp } from "./catalog";
import { WEIGHTS, isStale, overallScore, toTen } from "./scoring";

let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;
beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
});
afterAll(async () => {
  await db?.drop();
});

const PUBLISH = `chk_18plus_terms = true, chk_no_minor_content = true, chk_no_deepfake_feature = true,
  chk_privacy_policy = true, chk_operator_identifiable = true, checklist_checked_at = now()`;

async function app(slug: string, opts: { score?: number; status?: string; created?: string; nsfw?: boolean } = {}) {
  const s = opts.score ?? 50;
  const [r] = await sql<{ id: string }[]>`insert into apps (slug, name, website_url, score_conversation, score_memory,
      score_customization, score_media, score_value, score_privacy, nsfw_allowed, created_at, pros, cons)
    values (${slug}, ${slug.toUpperCase()}, 'https://example.com/x', ${s}, ${s}, ${s}, ${s}, ${s}, ${s},
      ${opts.nsfw ?? false}, ${opts.created ?? "2026-10-01"}, '{a,b,c}', '{d,e,f}') returning id`;
  const status = opts.status ?? "published";
  if (status !== "draft") {
    await sql.unsafe(`update apps set ${PUBLISH} where id = '${r!.id}'`);
    await sql`update apps set status = ${status}, removal_reason = ${status === "removed" ? "x" : null} where id = ${r!.id}`;
  }
  return r!.id;
}
async function category(slug: string, isNsfw = false, sort = 0) {
  const [c] = await sql<{ id: string }[]>`insert into categories (slug, name, is_nsfw, sort)
    values (${slug}, ${slug}, ${isNsfw}, ${sort}) returning id`;
  return c!.id;
}
const link = (appId: string, categoryId: string, rank: number | null = null) =>
  sql`insert into app_categories (app_id, category_id, rank_override) values (${appId}, ${categoryId}, ${rank})`;

beforeEach(async () => {
  await sql`delete from apps`;
  await sql`delete from categories`;
});

describe("scoring", () => {
  it("weights add up to 100 and the overall is the weighted average", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
    const s = { conversation: 80, memory: 70, customization: 60, media: 50, value: 90, privacy: 40 };
    // 80*.25 + 70*.15 + 60*.15 + 50*.15 + 90*.2 + 40*.1 = 20 + 10.5 + 9 + 7.5 + 18 + 4 = 69
    expect(overallScore(s)).toBe(69);
    expect(overallScore({ ...s, privacy: 45 })).toBe(69.5);
  });

  it("shows 0–10 with one decimal, rounding half up; boundaries 0 and 100", () => {
    expect([toTen(0), toTen(100), toTen(73.5), toTen(73.4), toTen(69)]).toEqual(["0.0", "10.0", "7.4", "7.3", "6.9"]);
  });

  it("stale after 90 days (exactly 90 days is not yet stale); never verified = stale", () => {
    const now = new Date("2026-10-29T00:00:00Z");
    expect(isStale(new Date("2026-07-31T00:00:00Z"), now)).toBe(false); // 90 days
    expect(isStale(new Date("2026-07-30T23:59:59Z"), now)).toBe(true);
    expect(isStale(null, now)).toBe(true);
  });
});

describe("public read model — only published apps ever leave the database", () => {
  it("app page: published only; draft, paused and removed are invisible", async () => {
    await app("live");
    for (const s of ["draft", "paused", "removed"]) await app(`x-${s}`, { status: s });
    expect((await loadPublishedApp(sql, "live"))?.name).toBe("LIVE");
    for (const s of ["draft", "paused", "removed"]) expect(await loadPublishedApp(sql, `x-${s}`)).toBeNull();
    expect(await loadPublishedApp(sql, "nope")).toBeNull();
  });

  it("app page: pricing carries source URL + date; never exposes affiliate URLs; alternatives skip NSFW categories and unpublished apps", async () => {
    const a = await app("main", { score: 60 });
    const b = await app("alt-good", { score: 90 });
    const c = await app("alt-draft", { status: "draft" });
    const n = await app("nsfw-only", { score: 99 });
    const sfw = await category("girlfriend");
    const adult = await category("adult", true);
    await link(a, sfw);
    await link(a, adult);
    await link(b, sfw);
    await link(c, sfw);
    await link(n, adult);
    const [s] = await sql<{ id: string }[]>`insert into sources (app_id, url, field, checked_at)
      values (${a}, 'https://example.com/pricing', 'pricing', '2026-10-29T00:00:00Z') returning id`;
    await sql`insert into pricing_plans (app_id, name, price_cents, currency, period, source_id)
      values (${a}, 'Pro', 1299, 'USD', 'month', ${s!.id})`;
    await sql`insert into affiliate_links (app_id, network, model, url_encrypted, url_hint)
      values (${a}, 'direct', 'cpa', 'v1.SECRETCIPHER', 'partner.test')`;

    const d = (await loadPublishedApp(sql, "main"))!;
    expect(d.pricing).toEqual([
      {
        name: "Pro",
        priceCents: 1299,
        currency: "USD",
        period: "month",
        notes: null,
        sourceUrl: "https://example.com/pricing",
        checkedAt: new Date("2026-10-29T00:00:00Z"),
      },
    ]);
    expect(d.hasActiveLink).toBe(true);
    expect(JSON.stringify(d)).not.toContain("SECRETCIPHER");
    expect(JSON.stringify(d)).not.toContain("partner.test");
    expect(d.alternatives.map((x) => x.slug)).toEqual(["alt-good"]);
    expect(d.categories.map((x) => [x.slug, x.isNsfw])).toEqual([
      ["adult", true],
      ["girlfriend", false],
    ]);
  });

  it("category ranking: rank override first, then our score, then name; unpublished excluded", async () => {
    const cat = await category("ranked");
    const ids = {
      low: await app("low", { score: 10 }),
      high: await app("high", { score: 90 }),
      pinned: await app("pinned", { score: 20 }),
      tieb: await app("tie-b", { score: 50 }),
      tiea: await app("tie-a", { score: 50 }),
      draft: await app("draft-one", { score: 100, status: "draft" }),
    };
    for (const [k, id] of Object.entries(ids)) await link(id, cat, k === "pinned" ? 1 : null);
    const page = (await loadCategoryPage(sql, "ranked"))!;
    expect(page.apps.map((a) => a.slug)).toEqual(["pinned", "high", "tie-a", "tie-b", "low"]);
    expect(await loadCategoryPage(sql, "missing")).toBeNull();
  });

  it("home: top by score, SFW categories with published counts only, newest first", async () => {
    const sfw = await category("sfw-cat");
    const adult = await category("adult-cat", true);
    const empty = await category("empty-cat");
    const a = await app("old-top", { score: 90, created: "2026-01-01" });
    const b = await app("new-low", { score: 30, created: "2026-10-20" });
    await app("hidden", { score: 100, status: "paused", created: "2026-10-28" });
    await link(a, sfw);
    await link(b, sfw);
    await link(a, adult);
    expect(empty).toBeTruthy();
    const h = await loadHomeData(sql);
    expect(h.top.map((x) => x.slug)).toEqual(["old-top", "new-low"]);
    expect(h.recent.map((x) => x.slug)).toEqual(["new-low", "old-top"]);
    expect(h.categories).toEqual([{ slug: "sfw-cat", name: "sfw-cat", isNsfw: false, count: 2 }]);
  });
});
