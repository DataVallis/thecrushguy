# TASK-012 feedback — public pages v1 (012a data pages, 012b info pages)
Status: DONE (Built) — Live on dev after merge; CWV/Lighthouse and legal facts open

## What I implemented
Home, category ranked list, app review page, 7 info pages, header/footer, disclosure line on money pages, `/go` CTAs with `rel="sponsored nofollow"`, editorial fields in admin + publish quality gate, cached read model. Details: `docs/technical/public-pages.md`, ADR-026.

## Files changed
- `src/app/[locale]/{layout,page}.tsx`, `category/[slug]/page.tsx`, `app/[slug]/page.tsx`, `[page]/page.tsx`
- `src/components/public/{site-chrome,app-bits}.tsx`, `src/lib/public/{catalog,cached,scoring}.ts` + `catalog.test.ts`
- `src/content/{legal.ts,info-pages.tsx}`, `src/i18n/{format.ts,messages/en.json,messages/de.json}`
- `src/lib/db/schema.ts` + `drizzle/0004_app_editorial.sql` (additive), `src/lib/db/schema.test.ts` (migration count from journal)
- admin: `src/lib/admin/{validation,repo,listing,values}.ts`, `src/app/admin/(console)/forms.tsx`, `repo.test.ts`
- docs: `technical/public-pages.md`, `technical/{README,admin,age-gate}.md`, `03-DECISIONS.md`, `tasks/README.md`, `HANDOFF.md`

## Deviations / open
- Comparison, alternatives, best-of, new-apps and filter pages (01-PRODUCT-SPEC §2) not in v1 — the spec's TASK-012 scope lists home/category/app/info only.
- FAQ blocks + schema.org → TASK-014. Screenshots/logos → later (avatar initial for now).
- `de.json` holds English copies (de is an unpublished scaffold locale).
- Soft 404 (status 200 + noindex) for unknown slugs — see technical doc "Known limitation".
- Weights fixed in code (spec: configurable in admin — later).

## New dependencies
None.

## Test results (2026-10-29 18:09 CET)
```
 Test Files  14 passed (14)
      Tests  162 passed (162)
lint ok · typecheck ok · format ok
env -u DATABASE_URL npm run build → ✓ Compiled successfully (no database needed at build)
```
HTTP (standalone build, real Postgres, sample app):
```
/en → hero, disclosure, "#1 Test Companion … 6.9 /10 … Visit Test Companion"
/en/app/test-companion → score 6.9, quick facts, breakdown with reasons + weights, pricing €12.99 / month · Source · checked Oct 29, 2026, pros/cons, verdict (2 paragraphs), categories
  CTAs: href="/go/test-companion?p=app-header&l=en" rel="sponsored nofollow noopener"
  age gate: SI no cookie → gate box · SI + cookie → "Adult content allowed: Yes" · GB + cookie → blocked · no country → blocked
robots meta: privacy, imprint → noindex (draft / facts missing); about, how-we-rank, app, category → indexable
server log after fix: 0 errors (fixed: `new Date()` during prerender → `connection()` in the app page)
```

## Deliberate breaks (restored → 162/162)
1. Published filter removed from `loadPublishedApp` → `× app page: published only…`.
2. Quality gate removed from `setAppStatus` → `× quality gate: each missing piece of content blocks publishing…`.

## NOT RUN
- Lighthouse / Core Web Vitals and screenshots — no browser in the agent environment (owner: Chrome DevTools → Lighthouse on https://dev.thecrushguy.com/en once an app is published, mobile).
- Accessibility audit with a tool (axe) — same reason; markup uses landmarks, skip link, labelled score badges.

## Suggested commit message
`feat: public pages v1 — home, rankings, app reviews, info pages (TASK-012)`
