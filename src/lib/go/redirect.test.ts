import { randomBytes } from "node:crypto";
import type postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { encryptLink } from "@/lib/crypto/link-cipher";
import { freshDb } from "../../../test/db";
import {
  CLICK_RATE_LIMIT,
  cleanLocale,
  cleanPlacement,
  countryOf,
  deviceOf,
  hashIp,
  isBot,
  logClick,
  referrerPath,
  resolveTarget,
  withSubId,
} from "./redirect";

let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;
beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
});
afterAll(async () => {
  await db?.drop();
});

const KEY = randomBytes(32);
const CHECKS = `chk_18plus_terms = true, chk_no_minor_content = true, chk_no_deepfake_feature = true,
  chk_privacy_policy = true, chk_operator_identifiable = true, checklist_checked_at = now()`;

async function app(slug: string, status = "published") {
  const [r] = await sql<
    { id: string }[]
  >`insert into apps (slug, name, website_url) values (${slug}, 'X', 'https://x.test') returning id`;
  if (status !== "draft") {
    await sql.unsafe(`update apps set ${CHECKS} where id = '${r!.id}'`);
    await sql`update apps set status = ${status}, removal_reason = ${status === "removed" ? "r" : null} where id = ${r!.id}`;
  }
  return r!.id;
}
async function link(appId: string, url: string, active = true, key = KEY) {
  const [r] = await sql<
    { id: string }[]
  >`insert into affiliate_links (app_id, network, model, url_encrypted, url_hint, active)
    values (${appId}, 'direct', 'revshare', ${encryptLink(url, key)}, 'h', ${active}) returning id`;
  return r!.id;
}
const opts = { placement: "hero", locale: "en" as const, key: KEY };

beforeEach(async () => {
  await sql`delete from apps`;
});

describe("resolveTarget", () => {
  it("published app with an active link → decrypted affiliate URL with {subid} filled", async () => {
    const id = await app("nomi-ai");
    const l = await link(id, "https://partner.test/r?id=AFF1&sub={subid}");
    expect(await resolveTarget(sql, "nomi-ai", opts)).toEqual({
      kind: "affiliate",
      appId: id,
      linkId: l,
      url: "https://partner.test/r?id=AFF1&sub=hero-en",
    });
  });

  it("geo-limited link: listed country → affiliate; other or unknown country → official website", async () => {
    const id = await app("geo-app");
    const l = await link(id, "https://partner.test/geo");
    await sql`update affiliate_links set countries = ${["GB", "US"]} where id = ${l}`;
    expect(await resolveTarget(sql, "geo-app", { ...opts, country: "US" })).toMatchObject({ kind: "affiliate" });
    expect(await resolveTarget(sql, "geo-app", { ...opts, country: "SI" })).toMatchObject({
      kind: "website",
      url: "https://x.test",
    });
    expect((await resolveTarget(sql, "geo-app", opts)).kind).toBe("website");
  });

  it("only inactive links → the app's official website, not a 404", async () => {
    await link(await app("candy-ai"), "https://p.test/x", false);
    const [w] = await sql`select website_url from apps where slug = 'candy-ai'`;
    expect(await resolveTarget(sql, "candy-ai", opts)).toMatchObject({ kind: "website", url: w!.website_url });
  });

  it("invalid stored website → our app page in a published locale", async () => {
    await app("odd-site");
    await sql`update apps set website_url = 'not a url' where slug = 'odd-site'`;
    expect(await resolveTarget(sql, "odd-site", opts)).toMatchObject({ kind: "app-page", url: "/en/app/odd-site" });
    expect(await resolveTarget(sql, "odd-site", { ...opts, locale: "de" })).toMatchObject({ url: "/en/app/odd-site" });
  });

  it("draft, paused and removed apps and unknown or malformed slugs → not-found", async () => {
    for (const s of ["draft", "paused", "removed"]) {
      const id = await app(`app-${s}`, s);
      await link(id, "https://p.test/x");
      expect((await resolveTarget(sql, `app-${s}`, opts)).kind).toBe("not-found");
    }
    for (const s of ["nope", "Bad", "../etc", "a".repeat(81), "x'; drop table apps;--"])
      expect((await resolveTarget(sql, s, opts)).kind).toBe("not-found");
  });

  it("undecryptable link (wrong key) → fails safe to the website", async () => {
    await link(await app("wrong-key"), "https://p.test/x", true, randomBytes(32));
    expect(await resolveTarget(sql, "wrong-key", opts)).toMatchObject({ kind: "website" });
  });
});

describe("logClick", () => {
  it(`logs ${CLICK_RATE_LIMIT.max} clicks per IP hash per hour, then skips (other IPs unaffected)`, async () => {
    const id = await app("busy");
    const l = await link(id, "https://p.test/x");
    const now = new Date("2026-10-29T12:00:00Z");
    const base = {
      appId: id,
      linkId: l,
      placement: "hero",
      locale: "en",
      country: null,
      device: "mobile",
      referrerPath: "/en",
      at: now,
    };
    const results = [];
    for (let i = 0; i < CLICK_RATE_LIMIT.max + 1; i++)
      results.push(await logClick(sql, { ...base, ipHash: "a".repeat(64) }));
    expect(results.filter(Boolean)).toHaveLength(CLICK_RATE_LIMIT.max);
    expect(results.at(-1)).toBe(false);
    expect(await logClick(sql, { ...base, ipHash: "b".repeat(64) })).toBe(true);
    // after the window the first IP may log again
    expect(
      await logClick(sql, {
        ...base,
        ipHash: "a".repeat(64),
        at: new Date(now.getTime() + CLICK_RATE_LIMIT.windowMs + 1),
      }),
    ).toBe(true);
  });

  it("the database refuses invalid placement/device values", async () => {
    const id = await app("bad-click");
    const base = {
      appId: id,
      linkId: null,
      placement: "hero",
      locale: null,
      country: null,
      device: "desktop",
      referrerPath: null,
      ipHash: "c".repeat(64),
      at: new Date(),
    };
    await expect(logClick(sql, { ...base, placement: "Hero Banner!" })).rejects.toMatchObject({ code: "23514" });
    await expect(logClick(sql, { ...base, device: "toaster" })).rejects.toMatchObject({ code: "23514" });
  });
});

describe("request helpers", () => {
  it("detects bots and empty user agents; real browsers are not bots", () => {
    for (const ua of [
      null,
      "",
      "Googlebot/2.1",
      "curl/8.4.0",
      "facebookexternalhit/1.1",
      "python-requests/2.31",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
    ])
      expect(isBot(ua)).toBe(true);
    for (const ua of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36",
    ])
      expect(isBot(ua)).toBe(false);
  });

  it("classifies devices", () => {
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile Safari")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-X710) Safari")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe("desktop");
  });

  it("cleans placement, locale, country and referrer", () => {
    expect([
      cleanPlacement("Hero"),
      cleanPlacement("<script>"),
      cleanPlacement(null),
      cleanPlacement("a".repeat(33)),
    ]).toEqual(["hero", "unknown", "unknown", "unknown"]);
    expect([cleanLocale("en"), cleanLocale("xx"), cleanLocale(null)]).toEqual(["en", null, null]);
    expect([countryOf("si"), countryOf("XX"), countryOf("T1"), countryOf("USA"), countryOf(null)]).toEqual([
      "SI",
      null,
      null,
      null,
      null,
    ]);
    const site = "https://thecrushguy.com";
    expect(referrerPath("https://thecrushguy.com/en/app/x?utm=1#y", site)).toBe("/en/app/x");
    expect(referrerPath("https://evil.test/en", site)).toBeNull();
    expect(referrerPath("not a url", site)).toBeNull();
  });

  it("IP hash: same IP + day → same hash, next day or other IP → different; never contains the IP", () => {
    const key = randomBytes(32).toString("base64");
    const d1 = new Date("2026-10-29T01:00:00Z");
    const d1b = new Date("2026-10-29T23:00:00Z");
    const d2 = new Date("2026-10-30T01:00:00Z");
    const h = hashIp("203.0.113.9", d1, key);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("203.0.113.9", d1b, key)).toBe(h);
    expect(hashIp("203.0.113.9", d2, key)).not.toBe(h);
    expect(hashIp("203.0.113.10", d1, key)).not.toBe(h);
    expect(h).not.toContain("203");
  });

  it("subid placeholder is URL-encoded and optional", () => {
    expect(withSubId("https://p.test/?s={subid}", "top list", "en")).toBe("https://p.test/?s=top%20list-en");
    expect(withSubId("https://p.test/?a=1", "hero", null)).toBe("https://p.test/?a=1");
  });
});
