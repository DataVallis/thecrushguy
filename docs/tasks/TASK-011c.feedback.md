# TASK-011c feedback — apps/categories admin, publish flow, audit
Status: DONE (Built) — Live on dev after merge deploy

## What I implemented
Admin console under `/admin` (dashboard with verification queue, apps list/new/edit, status panel, mark verified, categories list/create/edit, audit log), server actions with session guard, zod validation, repo layer writing data + audit in one transaction, cache-tag invalidation. Details: `docs/technical/admin.md`.

## Files changed
- `src/lib/admin/{validation,repo,values}.ts` + `repo.test.ts` — validation, data access, tests
- `src/app/admin/(console)/*` — pages, forms (client), actions, layout with nav; `src/app/admin/(auth)/*` — login pages moved into a group (no behaviour change)
- `src/app/admin/actions.guard.test.ts` — authorization guard test
- `src/lib/db/platforms.ts` — PLATFORMS in a client-safe module (re-exported from schema)
- docs: `technical/admin.md`, `technical/README.md`, `tasks/README.md`, `HANDOFF.md`

## Deviations
- No delete for apps/categories (apps are `removed` with a reason; categories can be renamed/re-parented). Report if delete is wanted.
- PR size ≈ 1,650 added lines (≈ 40 % tests) — over the ~800 guideline; the console is one coherent flow and splitting pages from the repo layer would have shipped unusable halves.

## New dependencies
None.

## Test results (2026-10-29 16:57 CET)
```
 Test Files  10 passed (10)
      Tests  114 passed (114)
lint ok · typecheck ok · format ok · build ✓ Compiled successfully (all /admin routes ◐ partial prerender)
```
End to end over HTTP (standalone build, real Postgres, signed in via magic link, forms submitted **without JavaScript**):
```
GET /admin, /admin/apps, /admin/apps/new, /admin/categories, /admin/audit → headings render, no errors
create category                                  → 303 ?saved=1; audit "create category owner@example.com"
duplicate category slug                          → 200, "Another category already uses this slug"
create app with 4/5 checks + injected status=published → 303; DB: status draft, 999 EUR, {web,ios}, checklist_checked_at null
edit page                                        → "published" option disabled
forced POST status=published (4/5)               → 200, "All five checklist items must be checked…", still draft
tick 5th item, publish                           → published, checklist_checked_at set; audit: update diff + status [draft, published]
anonymous action POST                            → 307 /admin/login
forged session cookie posts status=removed       → 303 /admin/login; app still published, audit count unchanged (4)
```

## Deliberate breaks
1. `requireAdmin()` removed from `markVerifiedAction` → guard test `× every exported action starts with await requireAdmin()` (received `["markVerifiedAction"]`); restored → 3/3.
2. Checklist stamp on ANY checked item instead of ALL → `× stamps checklist_checked_at only when all five are checked…`, 1 failed / 16; restored → 17/17. (Publish-guard tests stayed green because the DB constraint checks each item — defence in depth works.)

## NOT RUN
- Browser-JS path and visual screenshots — no browser in the agent environment; the no-JS form path was exercised instead.

## Suggested commit message
`feat: admin console for apps and categories with publish guard and audit (TASK-011c)`
