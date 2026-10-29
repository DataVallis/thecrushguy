import { randomBytes } from "node:crypto";
import type postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { decryptLink } from "@/lib/crypto/link-cipher";
import { freshDb } from "../../../test/db";
import { importAppsCsv, parseCsv } from "./csv-import";
import {
  addSource,
  affiliateInput,
  deletePricingPlan,
  deleteSource,
  listingFor,
  pricingInput,
  saveAffiliateLink,
  savePricingPlan,
  sourceInput,
} from "./listing";
import { AdminError } from "./repo";

let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;
beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
});
afterAll(async () => {
  await db?.drop();
});

const ACTOR = "owner@example.com";
const KEY = randomBytes(32);
const AFF_URL = "https://partner.example.com/?aff_id=SECRET123&sub=x";

async function newApp(slug = `a-${Math.random().toString(36).slice(2, 8)}`) {
  const [r] = await sql<
    { id: string }[]
  >`insert into apps (slug, name, website_url) values (${slug}, 'A', 'https://a.test') returning id`;
  return r!.id;
}
const src = (over: Record<string, unknown> = {}) =>
  sourceInput.parse({ url: "https://a.test/pricing", field: "pricing", checkedAt: "2026-10-29", ...over });
const price = (sourceId: string, over: Record<string, unknown> = {}) =>
  pricingInput.parse({ name: "Pro", price: "12.99", currency: "usd", period: "month", sourceId, ...over });
const link = (over: Record<string, unknown> = {}) =>
  affiliateInput.parse({ network: "direct", model: "revshare", url: AFF_URL, active: true, ...over });
async function expectAdminError(p: Promise<unknown>, field: string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AdminError);
  expect((err as AdminError).field).toBe(field);
}

beforeEach(async () => {
  await sql`delete from apps`;
});

describe("sources and pricing", () => {
  it("a price needs a source of the same app; cents are exact; edits are audited", async () => {
    const a = await newApp();
    const b = await newApp();
    const sa = await addSource(sql, ACTOR, a, src());
    const sb = await addSource(sql, ACTOR, b, src());
    await expectAdminError(savePricingPlan(sql, ACTOR, a, null, price(sb)), "sourceId");
    const id = await savePricingPlan(sql, ACTOR, a, null, price(sa));
    const [row] = await sql`select price_cents, currency from pricing_plans where id = ${id}`;
    expect(row).toEqual({ price_cents: 1299, currency: "USD" });
    await savePricingPlan(sql, ACTOR, a, id, price(sa, { price: "14" }));
    const audit =
      await sql`select action, diff from audit_log where entity = 'pricing_plan' and entity_id = ${id} order by id`;
    expect(audit.map((r) => r.action)).toEqual(["create", "update"]);
    expect(audit[1]!.diff).toEqual({ price_cents: [1299, 1400] });
  });

  it("price input: required source, no negative/odd prices", () => {
    expect(pricingInput.safeParse({ name: "x", price: "1", currency: "EUR", period: "month" }).success).toBe(false);
    for (const p of ["-1", "1.234", "", "abc"])
      expect(
        pricingInput.safeParse({ name: "x", price: p, currency: "EUR", period: "month", sourceId: crypto.randomUUID() })
          .success,
      ).toBe(false);
  });

  it("a source backing a price can't be deleted; an unused one can (audited); another app's source can't", async () => {
    const a = await newApp();
    const b = await newApp();
    const used = await addSource(sql, ACTOR, a, src());
    const unused = await addSource(sql, ACTOR, a, src({ url: "https://a.test/about", field: "operator" }));
    await savePricingPlan(sql, ACTOR, a, null, price(used));
    await expectAdminError(deleteSource(sql, ACTOR, a, used), "_form");
    await expectAdminError(deleteSource(sql, ACTOR, b, unused), "_form");
    await deleteSource(sql, ACTOR, a, unused);
    expect((await listingFor(sql, a)).sources.map((s) => s.id)).toEqual([used]);
    const [d] =
      await sql`select action from audit_log where entity = 'source' and entity_id = ${unused} and action = 'delete'`;
    expect(d).toBeTruthy();
  });

  it("deleting a price of another app is refused", async () => {
    const a = await newApp();
    const b = await newApp();
    const p = await savePricingPlan(sql, ACTOR, a, null, price(await addSource(sql, ACTOR, a, src())));
    await expectAdminError(deletePricingPlan(sql, ACTOR, b, p), "_form");
    await deletePricingPlan(sql, ACTOR, a, p);
    expect((await listingFor(sql, a)).plans).toHaveLength(0);
  });
});

describe("affiliate links", () => {
  it("stores only ciphertext + host hint; never returns or audits the URL", async () => {
    const a = await newApp();
    const id = await saveAffiliateLink(sql, ACTOR, a, null, link(), KEY);
    const [row] = await sql<
      { url_encrypted: string; url_hint: string }[]
    >`select url_encrypted, url_hint from affiliate_links where id = ${id}`;
    expect(row!.url_encrypted).not.toContain("SECRET123");
    expect(decryptLink(row!.url_encrypted, KEY)).toBe(AFF_URL);
    expect(row!.url_hint).toBe("partner.example.com");
    const view = (await listingFor(sql, a)).links[0]!;
    expect(JSON.stringify(view)).not.toContain("SECRET123");
    expect("url_encrypted" in view).toBe(false);
    const audit = await sql`select diff::text as d from audit_log where entity = 'affiliate_link'`;
    for (const r of audit) {
      expect(r.d).not.toContain("SECRET123");
      expect(r.d).not.toContain(row!.url_encrypted);
    }
  });

  it("activating a link deactivates the app's other links (one active per app), not other apps' links", async () => {
    const a = await newApp();
    const b = await newApp();
    const l1 = await saveAffiliateLink(sql, ACTOR, a, null, link(), KEY);
    const other = await saveAffiliateLink(sql, ACTOR, b, null, link(), KEY);
    const l2 = await saveAffiliateLink(sql, ACTOR, a, null, link({ network: "crakrevenue" }), KEY);
    const active = await sql`select id from affiliate_links where active order by id`;
    expect(active.map((r) => r.id).sort()).toEqual([l2, other].sort());
    expect(l1).toBeTruthy();
  });

  it("edit with blank URL keeps the stored ciphertext; a new URL replaces it and the audit says 'replaced'", async () => {
    const a = await newApp();
    const id = await saveAffiliateLink(sql, ACTOR, a, null, link(), KEY);
    const [{ url_encrypted: before }] = await sql`select url_encrypted from affiliate_links where id = ${id}`;
    await saveAffiliateLink(sql, ACTOR, a, id, link({ url: "", termsSummary: "30% lifetime" }), KEY);
    const [{ url_encrypted: same }] = await sql`select url_encrypted from affiliate_links where id = ${id}`;
    expect(same).toBe(before);
    await saveAffiliateLink(sql, ACTOR, a, id, link({ url: "https://new.example.com/r?id=Z" }), KEY);
    const [{ url_hint }] = await sql`select url_hint from affiliate_links where id = ${id}`;
    expect(url_hint).toBe("new.example.com");
    const [last] = await sql`select diff from audit_log where entity_id = ${id} order by id desc limit 1`;
    expect(last!.diff).toMatchObject({ url: "replaced", url_hint: ["partner.example.com", "new.example.com"] });
  });

  it("requires https and a URL on create; fails loudly without LINK_ENCRYPTION_KEY", async () => {
    expect(
      affiliateInput.safeParse({ network: "direct", model: "cpa", url: "http://x.test", active: true }).success,
    ).toBe(false);
    const a = await newApp();
    await expectAdminError(saveAffiliateLink(sql, ACTOR, a, null, link({ url: "" }), KEY), "url");
    const saved = process.env.LINK_ENCRYPTION_KEY;
    delete process.env.LINK_ENCRYPTION_KEY;
    try {
      await expectAdminError(saveAffiliateLink(sql, ACTOR, a, null, link()), "url");
    } finally {
      if (saved !== undefined) process.env.LINK_ENCRYPTION_KEY = saved;
    }
    expect((await listingFor(sql, a)).links).toHaveLength(0);
  });
});

describe("CSV import", () => {
  const HEADER =
    "slug,name,website_url,tagline,company_name,company_country,privacy_policy_url,platforms,nsfw_allowed,source_url,source_field,checked_at";
  const ROW1 = `nomi-ai,Nomi,https://nomi.ai,"Companion with memory, ""and"" more",Glimpse.ai,US,https://nomi.ai/privacy,web;ios;android,no,https://nomi.ai,listing basics,2026-10-29`;
  const ROW2 = `candy-ai,Candy AI,https://candy.ai,,EverAI,MT,,web,yes,https://candy.ai/terms,operator,2026-10-29`;

  it("parses RFC 4180 quoting, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, ""y""",z\r\n')).toEqual([
      ["a", "b"],
      ['x, "y"', "z"],
    ]);
    expect(() => parseCsv('a,"b')).toThrow("Unclosed quote");
  });

  it("imports drafts with sources, and a second identical run changes nothing (idempotent, no audit rows)", async () => {
    const csv = [HEADER, ROW1, ROW2].join("\n");
    expect(await importAppsCsv(sql, ACTOR, csv)).toEqual({
      created: 2,
      updated: 0,
      unchanged: 0,
      sourcesAdded: 2,
      errors: [],
    });
    const audits = (await sql`select count(*)::int as n from audit_log where action = 'import'`)[0]!.n;
    expect(await importAppsCsv(sql, ACTOR, csv)).toEqual({
      created: 0,
      updated: 0,
      unchanged: 2,
      sourcesAdded: 0,
      errors: [],
    });
    expect((await sql`select count(*)::int as n from audit_log where action = 'import'`)[0]!.n).toBe(audits);
    const apps =
      await sql`select slug, status, tagline, platforms, nsfw_allowed, chk_18plus_terms from apps order by slug`;
    expect(apps).toEqual([
      {
        slug: "candy-ai",
        status: "draft",
        tagline: null,
        platforms: ["web"],
        nsfw_allowed: true,
        chk_18plus_terms: false,
      },
      {
        slug: "nomi-ai",
        status: "draft",
        tagline: 'Companion with memory, "and" more',
        platforms: ["web", "ios", "android"],
        nsfw_allowed: false,
        chk_18plus_terms: false,
      },
    ]);
  });

  it("updates changed fields of existing apps but never touches status or checklist", async () => {
    await importAppsCsv(sql, ACTOR, [HEADER, ROW1].join("\n"));
    await sql`update apps set status = 'paused', chk_privacy_policy = true where slug = 'nomi-ai'`;
    const r = await importAppsCsv(sql, ACTOR, [HEADER, ROW1.replace(",Nomi,", ",Nomi AI,")].join("\n"));
    expect(r).toMatchObject({ updated: 1, created: 0 });
    const [a] = await sql`select name, status, chk_privacy_policy from apps where slug = 'nomi-ai'`;
    expect(a).toEqual({ name: "Nomi AI", status: "paused", chk_privacy_policy: true });
  });

  it("all-or-nothing: one bad row imports nothing and reports the line", async () => {
    const bad = `bad slug!,X,https://x.test,,,,,,,https://x.test,,2026-10-29`;
    const r = await importAppsCsv(sql, ACTOR, [HEADER, ROW1, bad].join("\n"));
    expect(r.created).toBe(0);
    expect(r.errors[0]).toMatch(/^Line 3: slug/);
    expect(await sql`select 1 from apps`).toHaveLength(0);
  });

  it("rejects missing required columns, duplicate slugs, unknown platforms, bad dates, javascript: URLs", async () => {
    expect((await importAppsCsv(sql, ACTOR, "slug,name\nx,X")).errors[0]).toMatch(
      /Missing columns: website_url, source_url, checked_at/,
    );
    const dup = await importAppsCsv(sql, ACTOR, [HEADER, ROW1, ROW1].join("\n"));
    expect(dup.errors).toEqual(["Line 3: duplicate slug nomi-ai"]);
    for (const [from, to] of [
      ["web;ios;android", "web;myspace"],
      ["2026-10-29", "29.10.2026"],
      ["https://nomi.ai/privacy", "javascript:alert(1)"],
    ])
      expect((await importAppsCsv(sql, ACTOR, [HEADER, ROW1.replace(from!, to!)].join("\n"))).errors).toHaveLength(1);
    expect(await sql`select 1 from apps`).toHaveLength(0);
  });
});
