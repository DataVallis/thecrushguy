# TASK-011d feedback — sources, pricing plans, affiliate links, CSV import
Status: DONE (Built) — Live on dev after merge deploy; affiliate links need owner secret `LINK_ENCRYPTION_KEY`

## What I implemented
Per-app sections on `/admin/apps/[id]` (sources, pricing plans, affiliate links) and `/admin/import`; repo + validation in `src/lib/admin/listing.ts` and `csv-import.ts`; actions with session guard; deploy wiring for `LINK_ENCRYPTION_KEY`. Details: `docs/technical/admin.md`.

## Files changed
- `src/lib/admin/listing.ts`, `src/lib/admin/csv-import.ts`, `src/lib/admin/listing.test.ts`
- `src/app/admin/(console)/actions.ts` (+6 actions), `listing-forms.tsx`, `apps/[id]/listing.tsx`, `apps/[id]/page.tsx`, `import/page.tsx`, `layout.tsx` (nav)
- `src/lib/admin/validation.ts` (`active` checkbox)
- `config/deploy.yml`, `.kamal/secrets.{dev,prod}`, `.github/workflows/deploy-{dev,prod}.yml` — `LINK_ENCRYPTION_KEY`
- docs: `technical/admin.md`, `technical/README.md`, `CHEATSHEET.md`, `tasks/README.md`, `HANDOFF.md`, `TASK-011c.feedback.md` (status)

## Deviations
- `APPS-SEED.csv` does not exist yet (TASK-006); the importer defines the format TASK-006 must deliver (documented in `technical/admin.md`).
- No edit form for existing pricing plans/sources (delete + re-add); affiliate links can be updated. Small UI scope on purpose.
- CSV parser written in-house (≈ 40 lines, RFC 4180) instead of a dependency.

## New dependencies
None.

## Test results (2026-10-29 ~17:05 CET)
```
 Test Files  11 passed (11)
      Tests  127 passed (127)
build ✓ Compiled successfully (/admin/import ◐)
```
End to end over HTTP (standalone build, real Postgres, no JS):
```
add source → 303 #listing
add plan 12.99 eur → pricing_plans: Premium|1299|EUR
add affiliate link https://partner.example.com/?aff=SECRET987 → 303
  page contains SECRET987: 0 · host hint shown: 1 · position of SECRET987 in url_encrypted: 0 · audit rows containing it: 0
delete source that backs the price → 200 "This source backs a price — change or delete that price first"; sources still 1
CSV import (paste) run 1 → created; run 2 → {"created":0,"updated":0,"unchanged":1,"sourcesAdded":0}
server log: 0 errors
```

## Deliberate breaks (all restored → 127/127)
1. Source ownership check dropped (price may cite another app's source) → `× a price needs a source of the same app…` 1 failed / 13.
2. Ciphertext included in the audit diff → `× stores only ciphertext + host hint; never returns or audits the URL` 1 failed / 13.
3. Import continues despite invalid rows → `× all-or-nothing…` and `× rejects missing required columns…` 2 failed / 13.

## NOT RUN
- JS-enabled browser path / screenshots — no browser here.
- Real `LINK_ENCRYPTION_KEY` on dev — owner secret (open action 0 in HANDOFF).

## Suggested commit message
`feat: sources, pricing plans, encrypted affiliate links and CSV import (TASK-011d)`
