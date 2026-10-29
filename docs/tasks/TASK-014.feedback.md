# TASK-014 feedback — SEO foundation
Status: DONE (Built) — Live on dev after merge; Rich Results Test needs prod (dev is noindex/behind Cloudflare)

## What I implemented
Canonical + hreflang (published locales + x-default), title/description limits, sitemap index + per locale/type sitemaps, JSON-LD (WebSite, Organization, ItemList, SoftwareApplication with own Review, BreadcrumbList), real HTTP 404s with a branded global 404 page. Details: `docs/technical/seo.md`, ADR-028.

## Files changed
`src/lib/seo/{meta,jsonld.tsx,sitemap,known-slugs,not-found}.ts` + `seo.test.tsx`, `src/app/sitemap.xml/route.ts`, `src/app/sitemaps/[name]/route.ts`, `src/app/global-not-found.tsx`, `src/proxy.ts`, `src/lib/routing.ts` (`/sitemaps/` unlocalized), `next.config.ts` (`experimental.globalNotFound`), pages (`[locale]/page.tsx`, `category/[slug]`, `app/[slug]`, `[page]`), `src/content/info-page-names.ts`, admin actions (drop slug cache on save), docs.

## Deviations
- OG images per page and FAQPage schema not built (no FAQ content yet) — listed under "Not yet" in `technical/seo.md`.
- `globalNotFound` is an experimental Next.js flag (ADR-028).

## New dependencies
None.

## Test results (2026-10-29 18:30 CET)
```
 Test Files  15 passed (15)
      Tests  173 passed (173)
lint ok · typecheck ok · env -u DATABASE_URL npm run build ✓
```
HTTP (standalone build, `APP_ENV=prod`, real Postgres):
```
404 /en/app/nope · 404 /en/app/nomi-ai (draft) · 404 /en/category/nope · 404 /en/nope-page · 404 /en/a/b/c  → <title>Page not found · The Crush Guy
200 /en/app/test-companion · 200 /en/category/ai-girlfriend · 200 /en/about
/sitemap.xml → index with /sitemaps/en-{pages,categories,apps}.xml · /sitemaps/en-apps.xml → 1 published app with lastmod · /sitemaps/de-apps.xml → 404
app page: canonical + hreflang en + x-default; JSON-LD SoftwareApplication + BreadcrumbList parse as valid JSON
server log: 0 errors
```

## Deliberate breaks (restored → 173/173)
1. Known slugs include unpublished apps → `× known slugs: published apps only, all categories`.
2. JSON-LD without `<` escaping → `× script content can't break out of the tag`.

## NOT RUN
- Google Rich Results Test / Search Console — needs a public, indexable prod URL.
- Lighthouse — no browser here.

## Suggested commit message
`feat: SEO foundation — sitemaps, hreflang, JSON-LD, real 404s (TASK-014)`
