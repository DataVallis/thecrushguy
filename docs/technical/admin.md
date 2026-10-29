# Admin console — apps, categories, publish flow, audit

Status: apps/categories/publish/audit **Live on dev** (TASK-011c, PR #6); sources/pricing/affiliate links/import **Live on dev** (TASK-011d, PR #7). Auth: see `auth.md`.

## Pages (`src/app/admin/(console)/`, all behind `requireAdmin()`)
| Path | What |
|---|---|
| `/admin` | Dashboard: signed-in user + verification queue (never verified first, then oldest `verified_at`; removed apps excluded) |
| `/admin/apps` | All apps: status, checklist complete?, verified, updated |
| `/admin/apps/new`, `/admin/apps/[id]` | App form (basics, pricing, platforms, features, operator, editorial scores, categories, compliance checklist); status panel; "Mark verified now" |
| `/admin/categories`, `/admin/categories/[id]` | List + create; edit (parent, sort, NSFW flag) |
| `/admin/import` | CSV import of app listings (below) |
| `/admin/audit` | Latest 100 audit entries with diffs |

Login pages live in `(auth)/` with their own narrow layout; `(console)/layout.tsx` adds the nav. Admin UI is English-only (ADR-022).

## Write path
form → server action (`(console)/actions.ts`) → `requireAdmin()` (identity from the session only) → `formToObject` (reads **only** whitelisted field names — `status`, ids, `checklist_checked_at` etc. sent by a client are ignored) → zod schema (`src/lib/admin/validation.ts`) → repo function (`src/lib/admin/repo.ts`) in **one transaction with its `audit_log` row** → `updateTag("apps" | "app:<slug>" | "categories")` (ADR-013) → redirect with `?saved=1`.
Validation or constraint errors come back to the form (`useActionState`) with the typed values kept. Forms also work without JavaScript.

## Editorial fields + quality gate (TASK-012a, ADR-026)
Score reasons, pros/cons/best-for (one per line), verdict. Publishing (and editing a published app, or deleting its last price) requires all six scores with reasons, verdict, 3–5 pros, 3–5 cons and ≥ 1 sourced price; the message names what is missing.

## Rules enforced
- **Publish guard (07-LEGAL §2):** the DB check `apps_publish_requires_checklist` refuses `published` unless all five checklist items are true and `checklist_checked_at` is set; the UI disables the option and shows the DB refusal as a message. Unchecking an item on a published app is refused the same way.
- `checklist_checked_at` is stamped when the checklist becomes complete or any item changes while complete; unrelated edits keep it; unchecking clears it.
- `removed` requires a reason; leaving `removed` clears the reason.
- Prices are typed as `9.99` and stored as integer cents; scores 0–100 integers; only http(s) URLs; slugs kebab-case.
- Category parents: self and loops (A → B → A) refused.
- Every create/update/status/verify writes an `audit_log` row (`actor_email`, action, entity, `{field: [old, new]}`); a no-op save writes nothing. `audit_log` is append-only at DB level (TASK-011a).

## Sources, pricing plans, affiliate links (TASK-011d) — `src/lib/admin/listing.ts`, `apps/[id]/listing.tsx`
- **Sources**: url (http/s), what it supports (`field`), checked date (default today), optional archive URL. A source backing a price can't be deleted (FK `restrict` → friendly message).
- **Pricing plans**: name, price typed `12.99` → `price_cents` 1299, currency, period; **a source of the same app is required** (CLAUDE.md hard rule: every factual claim has a source).
- **Affiliate links**: network, model, terms summary, optional source, active flag. The URL must be https, is encrypted with AES-256-GCM (`LINK_ENCRYPTION_KEY`, `src/lib/crypto/link-cipher.ts`) before the INSERT and is **never read back for display, echoed into a form or written to the audit log** — the UI shows only the host (`url_hint`); the audit records `url: "replaced"`. Blank URL on update keeps the stored one. Activating a link deactivates the app's other links in the same transaction (one active per app, DB unique index). Without `LINK_ENCRYPTION_KEY` the save fails with a clear message and nothing is stored.

## CSV import (`/admin/import`, `src/lib/admin/csv-import.ts`)
Columns `slug,name,website_url,tagline,company_name,company_country,privacy_policy_url,platforms,nsfw_allowed,source_url,source_field,checked_at` (required: slug, name, website_url, source_url, checked_at; platforms `;`-separated; dates `YYYY-MM-DD`; ≤ 1,000 rows, ≤ 1 MB). Upload a file or paste text.
- Validate all rows first; **any invalid row → nothing imported**, errors listed per line.
- Match by slug: new → `draft` with empty checklist; existing → only changed listed columns updated (never status or checklist); source added if that (url, field) is new. Every change audited as `import`.
- Idempotent: the same file twice → second run "unchanged", no new rows or audit entries.

Delete of apps/categories is intentionally absent: apps are `removed` with a reason.

## Tests
- `src/lib/admin/repo.test.ts` (real Postgres): create/update/audit diffs, duplicate slug rollback, unknown category rollback, actor required, checklist stamping, publish guard for each missing item, unpublish-by-uncheck refused, removal reason, verification queue order, category loops, validation boundaries, no mass assignment.
- `src/lib/admin/listing.test.ts` (real Postgres): price needs a source of the same app, cents, audit diffs, source delete guard, cross-app delete refused, ciphertext only + URL never in reads/audit, one active link, blank URL keeps ciphertext, https only, missing key fails loudly; CSV quoting/CRLF/BOM, idempotent import, status/checklist untouched, all-or-nothing, column/duplicate/platform/date/URL validation.
- `src/app/admin/actions.guard.test.ts`: every exported admin server action starts with `await requireAdmin()` (sign-in/out actions exempt).
