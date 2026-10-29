# Database — Status: Live on dev (2026-10-29)

PostgreSQL 16, Drizzle ORM + postgres.js (ADR-011). Schema: `src/lib/db/schema.ts`. Migrations: `drizzle/` (generated, plain SQL, reviewed in PRs).

## Tables
| Table | Purpose | Key rules (enforced in the DB) |
|---|---|---|
| `apps` | One listed AI companion app | slug lowercase-kebab + unique; scores 0–100; price ≥ 0; currency `^[A-Z]{3}$`; **publish only with the full compliance checklist** (`apps_publish_requires_checklist`); `removed` requires `removal_reason` |
| `categories` | Groupings (tree via `parent_id`) | slug format + unique; not its own parent |
| `app_categories` | App ↔ category with optional `rank_override` | PK (app, category); rank ≥ 1 |
| `sources` | Source URL + checked date for factual claims | URL must be http(s) |
| `pricing_plans` | Plans with integer `price_cents` | price ≥ 0; **`source_id` required** (a price is a factual claim) |
| `affiliate_links` | Affiliate URL per app | URL stored **encrypted** (`url_encrypted`, AES-256-GCM), only a host hint in clear; **max one active link per app** |
| `translations` | Per-locale field values (`machine` / `reviewed`) | unique (entity, id, field, locale); locale `xx` or `xx-YY`. Editor deferred (ADR-020) |
| `audit_log` | Who changed what | **append-only**: trigger blocks UPDATE, DELETE, TRUNCATE (migration 0001) |

Compliance checklist columns on `apps` (07-LEGAL-COMPLIANCE §2): `chk_18plus_terms`, `chk_no_minor_content`, `chk_no_deepfake_feature`, `chk_privacy_policy`, `chk_operator_identifiable`, `checklist_checked_at`, `checklist_note`.

## Migrations
- Change the schema → `npm run db:generate` → commit the new `drizzle/*.sql` + `drizzle/meta/*`.
- CI runs `npm run db:check`: fails if the schema and the committed migrations differ (drift).
- Deployed containers apply pending migrations at start when `RUN_MIGRATIONS=1` (`src/instrumentation.ts` → `src/instrumentation-node.ts` → `src/lib/db/migrate.ts`). A failed migration exits the container; kamal-proxy keeps the old version serving.
- Never edit an applied migration; add a new one. Backward compatible only (expand → migrate → contract) — every merge to `main` deploys prod (ADR-021).
- Local: `npm run db:migrate` (uses `DATABASE_URL`).

## Affiliate URL encryption (`src/lib/crypto/link-cipher.ts`)
`encryptLink` / `decryptLink` with AES-256-GCM, random 12-byte IV, auth tag; token format `v1.<iv>.<tag>.<ct>` (base64url). Key: env `LINK_ENCRYPTION_KEY` (32 bytes, base64; `openssl rand -base64 32`). Tampered tokens or a wrong key throw. Used by the admin (TASK-011d) and `/go/` (TASK-013).

## Tests
`src/lib/db/schema.test.ts` creates a uniquely named database per run (`test/db.ts`), migrates it from zero and drops it afterwards; needs `DATABASE_URL` pointing at a Postgres server where the user may `CREATE DATABASE` (local Docker / CI service). A missing `DATABASE_URL` fails the suite.
