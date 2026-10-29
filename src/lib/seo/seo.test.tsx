import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freshDb } from "../../../test/db";
import { appLd, categoryListLd, JsonLd } from "./jsonld";
import { loadKnownSlugs } from "./known-slugs";
import { alternatesFor, clamp, DESCRIPTION_MAX } from "./meta";
import { needsSlugCheck, notFoundPath, notFoundRewrite } from "./not-found";
import { indexXml, MAX_URLS, parseSitemapName, sitemapEntries, urlsetXml } from "./sitemap";
import { renderToStaticMarkup } from "react-dom/server";
import type { AppDetail } from "@/lib/public/catalog";

let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;
beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
  const pub = `chk_18plus_terms = true, chk_no_minor_content = true, chk_no_deepfake_feature = true,
    chk_privacy_policy = true, chk_operator_identifiable = true, checklist_checked_at = now(), status = 'published'`;
  await sql`insert into apps (slug, name, website_url) values ('live-app', 'Live', 'https://x.test'), ('draft-app', 'Draft', 'https://x.test')`;
  await sql.unsafe(`update apps set ${pub} where slug = 'live-app'`);
  const [c1] = await sql`insert into categories (slug, name) values ('sfw', 'SFW') returning id`;
  const [c2] = await sql`insert into categories (slug, name, is_nsfw) values ('adult', 'Adult', true) returning id`;
  await sql`insert into categories (slug, name) values ('empty', 'Empty')`;
  const [a] = await sql`select id from apps where slug = 'live-app'`;
  await sql`insert into app_categories (app_id, category_id) values (${a!.id}, ${c1!.id}), (${a!.id}, ${c2!.id})`;
});
afterAll(async () => {
  await db?.drop();
});
const SITE = "https://thecrushguy.com";

describe("hreflang / canonical", () => {
  it("canonical per locale; alternates only for published locales + x-default", () => {
    expect(alternatesFor("en", "/app/x")).toEqual({
      canonical: "/en/app/x",
      languages: { en: "/en/app/x", "x-default": "/en/app/x" },
    });
    expect(alternatesFor("de", "").canonical).toBe("/de"); // unpublished locale is never listed as an alternate
    expect(Object.keys(alternatesFor("de", "").languages!)).not.toContain("de");
  });

  it("clamp keeps titles/descriptions within limits at a word boundary", () => {
    expect(clamp("short", 10)).toBe("short");
    const long = clamp("word ".repeat(80), DESCRIPTION_MAX);
    expect(long.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(long.endsWith("…")).toBe(true);
    expect(clamp("a".repeat(200), 20)).toHaveLength(20);
  });
});

describe("sitemaps", () => {
  it("index lists published locales × 3 types; names are validated", () => {
    const xml = indexXml(SITE);
    expect(xml).toContain("<loc>https://thecrushguy.com/sitemaps/en-apps.xml</loc>");
    expect(xml).not.toContain("/de-");
    expect(parseSitemapName("en-apps.xml")).toEqual({ locale: "en", type: "apps" });
    for (const bad of ["de-apps.xml", "en-users.xml", "en-apps.xml.bak", "../x"])
      expect(parseSitemapName(bad)).toBeNull();
  });

  it("contain only indexable URLs: published apps, non-empty SFW categories, indexable info pages", async () => {
    const apps = await sitemapEntries(sql, SITE, "en", "apps");
    expect(apps.map((e) => e.loc)).toEqual([`${SITE}/en/app/live-app`]);
    const cats = await sitemapEntries(sql, SITE, "en", "categories");
    expect(cats.map((e) => e.loc)).toEqual([`${SITE}/en/category/sfw`]);
    const pages = (await sitemapEntries(sql, SITE, "en", "pages")).map((e) => e.loc);
    expect(pages[0]).toBe(`${SITE}/en`);
    expect(pages).toContain(`${SITE}/en/how-we-rank`);
  });

  it("escapes XML and caps at 10k URLs", () => {
    expect(urlsetXml([{ loc: "https://x.test/a?b=1&c=<d>" }])).toContain(
      "<loc>https://x.test/a?b=1&amp;c=&lt;d&gt;</loc>",
    );
    const many = Array.from({ length: MAX_URLS + 5 }, (_, i) => ({ loc: `https://x.test/${i}` }));
    expect(urlsetXml(many).match(/<url>/g)).toHaveLength(MAX_URLS);
  });
});

describe("real 404 decision (proxy)", () => {
  const known = { apps: new Set(["live-app"]), categories: new Set(["sfw"]) };
  it("unknown app/category slugs and unknown info pages are rewritten to the 404 route", () => {
    expect(notFoundRewrite("/en/app/live-app", known)).toBeNull();
    expect(notFoundRewrite("/en/app/draft-app", known)).toBe(notFoundPath("en"));
    expect(notFoundRewrite("/en/category/sfw", known)).toBeNull();
    expect(notFoundRewrite("/en/category/nope", known)).toBe(notFoundPath("en"));
    expect(notFoundRewrite("/en/how-we-rank", known)).toBeNull();
    expect(notFoundRewrite("/en/nope-page", null)).toBe(notFoundPath("en"));
    expect(notFoundRewrite("/en/app", known)).toBe(notFoundPath("en"));
  });

  it("passes through home, the 404 route itself, non-locale paths, and slugs when the DB is unavailable", () => {
    for (const p of ["/en", notFoundPath("en"), "/api/health", "/go/x", "/xx/app/y"])
      expect(notFoundRewrite(p, known)).toBeNull();
    expect(notFoundRewrite("/en/app/anything", null)).toBeNull();
    expect(needsSlugCheck("/en/app/x")).toBe(true);
    expect(needsSlugCheck("/en/how-we-rank")).toBe(false);
  });

  it("known slugs: published apps only, all categories", async () => {
    const k = await loadKnownSlugs(sql);
    expect([...k.apps]).toEqual(["live-app"]);
    expect([...k.categories].sort()).toEqual(["adult", "empty", "sfw"]);
  });
});

describe("JSON-LD", () => {
  const app = {
    slug: "live-app",
    name: "Live",
    overall: 73.5,
    hasFreePlan: false,
    currency: "USD",
    platforms: ["web", "ios"],
    verifiedAt: new Date("2026-10-29T00:00:00Z"),
    pricing: [{ priceCents: 999, currency: "EUR" }],
  } as unknown as AppDetail;

  it("app: SoftwareApplication with our own Review (no AggregateRating), cheapest offer, OS list", () => {
    const ld = appLd(SITE, "en", app);
    expect(ld).toMatchObject({
      "@type": "SoftwareApplication",
      operatingSystem: "Web, iOS",
      offers: { price: "9.99", priceCurrency: "EUR" },
      review: {
        "@type": "Review",
        reviewRating: { ratingValue: "7.4", bestRating: "10" },
        datePublished: "2026-10-29",
      },
    });
    expect(JSON.stringify(ld)).not.toContain("aggregateRating");
  });

  it("category ItemList keeps the ranked order", () => {
    const ld = categoryListLd(SITE, "en", {
      slug: "c",
      name: "C",
      description: null,
      isNsfw: false,
      apps: [app, { ...app, slug: "b", name: "B" }],
    });
    expect((ld.itemListElement as { position: number; url: string }[]).map((i) => [i.position, i.url])).toEqual([
      [1, `${SITE}/en/app/live-app`],
      [2, `${SITE}/en/app/b`],
    ]);
  });

  it("script content can't break out of the tag", () => {
    const html = renderToStaticMarkup(<JsonLd data={{ name: "</script><script>alert(1)</script>" }} />);
    expect(html).not.toContain("</script><script>");
    expect(html).toContain("\\u003c/script>");
  });
});
