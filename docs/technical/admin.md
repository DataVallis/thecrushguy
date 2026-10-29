# Admin console — apps, categories, publish flow, audit

Status: **Built** (TASK-011c). Auth: see `auth.md`.

## Pages (`src/app/admin/(console)/`, all behind `requireAdmin()`)
| Path | What |
|---|---|
| `/admin` | Dashboard: signed-in user + verification queue (never verified first, then oldest `verified_at`; removed apps excluded) |
| `/admin/apps` | All apps: status, checklist complete?, verified, updated |
| `/admin/apps/new`, `/admin/apps/[id]` | App form (basics, pricing, platforms, features, operator, editorial scores, categories, compliance checklist); status panel; "Mark verified now" |
| `/admin/categories`, `/admin/categories/[id]` | List + create; edit (parent, sort, NSFW flag) |
| `/admin/audit` | Latest 100 audit entries with diffs |

Login pages live in `(auth)/` with their own narrow layout; `(console)/layout.tsx` adds the nav. Admin UI is English-only (ADR-022).

## Write path
form → server action (`(console)/actions.ts`) → `requireAdmin()` (identity from the session only) → `formToObject` (reads **only** whitelisted field names — `status`, ids, `checklist_checked_at` etc. sent by a client are ignored) → zod schema (`src/lib/admin/validation.ts`) → repo function (`src/lib/admin/repo.ts`) in **one transaction with its `audit_log` row** → `updateTag("apps" | "app:<slug>" | "categories")` (ADR-013) → redirect with `?saved=1`.
Validation or constraint errors come back to the form (`useActionState`) with the typed values kept. Forms also work without JavaScript.

## Rules enforced
- **Publish guard (07-LEGAL §2):** the DB check `apps_publish_requires_checklist` refuses `published` unless all five checklist items are true and `checklist_checked_at` is set; the UI disables the option and shows the DB refusal as a message. Unchecking an item on a published app is refused the same way.
- `checklist_checked_at` is stamped when the checklist becomes complete or any item changes while complete; unrelated edits keep it; unchecking clears it.
- `removed` requires a reason; leaving `removed` clears the reason.
- Prices are typed as `9.99` and stored as integer cents; scores 0–100 integers; only http(s) URLs; slugs kebab-case.
- Category parents: self and loops (A → B → A) refused.
- Every create/update/status/verify writes an `audit_log` row (`actor_email`, action, entity, `{field: [old, new]}`); a no-op save writes nothing. `audit_log` is append-only at DB level (TASK-011a).

## Not yet (TASK-011d)
Pricing plans, sources, affiliate links, CSV import. Delete of apps/categories is intentionally absent: apps are `removed` with a reason.

## Tests
- `src/lib/admin/repo.test.ts` (real Postgres): create/update/audit diffs, duplicate slug rollback, unknown category rollback, actor required, checklist stamping, publish guard for each missing item, unpublish-by-uncheck refused, removal reason, verification queue order, category loops, validation boundaries, no mass assignment.
- `src/app/admin/actions.guard.test.ts`: every exported admin server action starts with `await requireAdmin()` (sign-in/out actions exempt).
