# Public pages

Status: **Built** (TASK-012a/b). Code: `src/app/[locale]/*`, `src/components/public/*`, `src/lib/public/*`, `src/content/*`.

## Routes
| Route | What | Data |
|---|---|---|
| `/{locale}` | Hero, disclosure, top 10 by score, SFW categories (with published counts), 5 newest | `getHomeData()` after `connection()` |
| `/{locale}/category/{slug}` | Ranked list: admin rank override (1, 2, …) first, then our score, then name | `getCategoryPage()` |
| `/{locale}/app/{slug}` | Review (01-PRODUCT-SPEC §3): score + CTA, quick facts, adult-content fact behind the age gate, score breakdown with reasons and weights, sourced pricing table, pros/cons, best for, verdict, operator + privacy policy, categories, alternatives, last verified / "being re-checked" (> 90 days), report link | `getPublishedApp()` |
| `/{locale}/{about,how-we-rank,affiliate-disclosure,privacy,terms,imprint,contact}` | Static info pages, prerendered at build | `src/content/info-pages.tsx`, `src/content/legal.ts` |

Header (logo, How we rank) and footer (info links, independence + wellbeing note) come from `[locale]/layout.tsx`. Every money page shows the affiliate disclosure line (`Disclosure`).

## Rules in code
- **Only published apps** are ever read (`src/lib/public/catalog.ts`); affiliate URLs are never selected (only "has an active link").
- **Score** (`scoring.ts`): weighted average Conversation 25 · Memory 15 · Customization 15 · Media 15 · Value 20 · Privacy 10; shown 0–10 with one decimal. Payout data is not an input (ADR-005).
- **CTAs** go to `/go/{slug}?p={placement}&l={locale}` with `rel="sponsored nofollow noopener"`; the button is hidden when an app has no active link.
- **NSFW**: adults-only categories are gated as a whole and `noindex`; on app pages only the "adult content allowed" fact is gated — the page stays indexable because everyone without the cookie (crawlers included) sees the same SFW box (ADR-026 corrects ADR-025).
- **No HTML from the database**: Markdown fields render as plain paragraphs.
- **Caching** (`cached.ts`): `use cache` + tags `apps`, `app:<slug>`, `categories`, `category:<slug>`, `cacheLife("hours")`; admin saves call `updateTag`. Data is only read at request time (after `connection()` / runtime params) — the Docker build has no database (`env -u DATABASE_URL npm run build` passes).
- **noindex**: unpublished locales, empty or adults-only categories, unknown slugs, privacy/terms only if `LEGAL_TEXTS_REVIEWED` is switched back to false; imprint if company facts in `src/content/legal.ts` are removed (ADR-027).

## Unknown URLs
Real HTTP 404s since TASK-014 — the proxy rewrites unknown slugs to the global 404 page (`docs/technical/seo.md`, ADR-028).

## Tests
`src/lib/public/catalog.test.ts` (real Postgres): weights/rounding/staleness boundaries, published-only for app/category/home, pricing with source + date, no affiliate data in the read model, alternatives skip NSFW categories and unpublished apps, ranking order (override → score → name), home lists. Quality gate: `src/lib/admin/repo.test.ts`.
