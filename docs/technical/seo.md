# SEO foundation

Status: **Live on dev** (TASK-014, PR #13). Code: `src/lib/seo/*`, `src/app/sitemap.xml`, `src/app/sitemaps/[name]`, `src/app/global-not-found.tsx`, `src/proxy.ts`.

## Canonical + hreflang (`meta.ts`)
`alternatesFor(locale, path)` on home, category, app and info pages: absolute canonical per locale (via `metadataBase`), `hreflang` for **published locales only** plus `x-default` → default locale (ADR-012/016 quality bar). Unpublished locales (`de`) keep their own canonical and `noindex`, and are never listed as alternates.
Titles are clamped to fit 60 characters with the " · The Crush Guy" suffix, descriptions to 155 (word boundary + "…").

## Sitemaps (`sitemap.ts`)
- `/sitemap.xml` — index of `/sitemaps/{locale}-{pages|categories|apps}.xml` for published locales. Empty index outside prod (non-prod is never indexed).
- `/sitemaps/en-pages.xml` — home + indexable info pages; `…-categories.xml` — non-empty SFW categories (lastmod = newest app change); `…-apps.xml` — published apps (lastmod = `updated_at`). Max 10,000 URLs per file; unknown/unpublished names → 404.
- `robots.txt` (prod) points to `/sitemap.xml`.

## Structured data (`jsonld.tsx`)
| Page | Types |
|---|---|
| Home | `WebSite`, `Organization` |
| Category (SFW only) | `ItemList` (ranked order), `BreadcrumbList` |
| App | `SoftwareApplication` with our own `Review` (rating 0–10, by The Crush Guy — never an `AggregateRating`, 07-LEGAL §2.5), cheapest `Offer` (0 when there is a free plan), OS list; `BreadcrumbList` |
`FAQPage` waits for FAQ content (no FAQ fields yet). JSON is escaped so database text can't close the script tag.
Validate after deploy: https://search.google.com/test/rich-results with an app URL on prod.

## Real 404s
Pages stream, so `notFound()` inside them can only answer 200 + noindex. The proxy decides first (`not-found.ts`):
- `/{locale}/app/{slug}` / `/{locale}/category/{slug}` with a slug that is not a published app / existing category, and `/{locale}/{x}` that is not an info page → rewrite to `/{locale}/__nf/no/route`, which matches no route → `app/global-not-found.tsx` with **HTTP 404** (experimental `globalNotFound`, needed because the app has two root layouts — ADR-028).
- Deeper unknown paths match no route and get the same 404.
- The slug list (`known-slugs.ts`) is cached in memory for 60 s and dropped on every admin save; if the database is unreachable the slug check is skipped (no false 404s).

## Not yet
OG images per page (default `og-default.png` is used), FAQ schema, per-locale translated slugs (decide with the second published locale).

## Tests
`src/lib/seo/seo.test.tsx` (real Postgres): alternates, clamp, sitemap index/names/entries/escaping/cap, 404 decisions, known slugs (published only), JSON-LD shape (no AggregateRating) and script-tag escaping.
