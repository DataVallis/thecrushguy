# TASK-011a feedback — data model + migrations
Status: DONE (pending CI on the PR)

## What I implemented
Full data model from 01-PRODUCT-SPEC §5 (minus `Click`/`AdSlot`, which belong to TASK-013/Phase 3) with the important rules enforced in Postgres: compliance-checklist publish guard, integer money, score range, slug/currency/country formats, required price sources, one active affiliate link per app, append-only audit log. Startup migrations (`RUN_MIGRATIONS=1`, pattern from postaja), migration drift check in CI, AES-256-GCM helper for affiliate URLs, isolated per-run test databases.

## Files changed (path — why)
- `src/lib/db/schema.ts` — tables, enums, checks, indexes
- `drizzle/0000_init_data_model.sql`, `drizzle/0001_audit_log_append_only.sql`, `drizzle/meta/*` — migrations
- `src/lib/db/migrate.ts`, `src/instrumentation.ts`, `src/instrumentation-node.ts` — migrate at start
- `src/lib/crypto/link-cipher.ts` (+ test) — affiliate URL encryption
- `src/lib/db/schema.test.ts`, `test/db.ts` — DB rule tests on a fresh DB per run
- `Dockerfile` (copy `drizzle/`), `config/deploy.yml` (`RUN_MIGRATIONS: "1"`), `.github/workflows/ci.yml` + `package.json` (`db:check`), `.env.example`
- Docs: `docs/technical/database.md`, `docs/technical/README.md`, HANDOFF, tasks/README, CHEATSHEET

## Deviations
- `Click` and `AdSlot` tables not created (TASK-013 / Phase 3 own them).
- `affiliate_url_env_key` from the spec replaced by an encrypted column (`url_encrypted` + `url_hint`) — the spec allowed "encrypted in DB or secret reference"; per-link env vars would not scale to 100+ apps.
- `logo_asset_id` / `screenshots[]` → `logo_path` only for now; an assets table comes with the admin when uploads exist (TASK-011c/d).
- `platforms` is a `text[]` validated in the app layer (zod, 011c) instead of a Postgres enum array (easier to extend).

## New dependencies
None (zod/nodemailer come with 011b/c as approved).

## How to verify
`DATABASE_URL=<server where the user can CREATE DATABASE> npm test` → 5 files, 64 tests passed. `npm run db:check` → exit 0, "No schema changes".

## Test results (this session, 2026-10-29)
```
 Test Files  5 passed (5)
      Tests  64 passed (64)
```
db:check clean → exit 0. Build: ✓ Compiled successfully, 7/7 static pages.
Standalone server on an EMPTY database with `RUN_MIGRATIONS=1`:
```
✓ Ready in 0ms
[migrate] done
{"status":"ok","db":"ok","env":"dev","sha":"boot-test"}
tables: affiliate_links,app_categories,apps,audit_log,categories,pricing_plans,sources,translations
drizzle.__drizzle_migrations: 2
```

## Deliberate breaks
1. Publish guard removed from the migration → `Tests 7 failed | 21 passed (28)` (6 checklist cases + draft→published update); restored → 64 passed.
2. Audit-log trigger migration emptied → `× rejects UPDATE, DELETE and TRUNCATE…`, `Tests 1 failed | 27 passed (28)`; restored → passing.
3. Column added to the schema without a migration → `db:check` exit 1 (generated `drift_probe` migration detected); restored → exit 0.

## NOT RUN
- Docker image build / Kamal — not available in the agent environment (first deploy proves it).

## Incident during the session (no impact on the result)
Two `git checkout -- <file>` calls restored files from the index and silently reverted uncommitted edits (`schema.ts`, earlier `route.ts`). Both were re-applied; `db:check` "No schema changes" proves `schema.ts` matches the generated migrations exactly. Lesson: no `git checkout --` on files with unstaged work; restore from a temp copy.

## Suggested commit message
```
feat: data model, migrations and DB-level publish guard (TASK-011a)
```
