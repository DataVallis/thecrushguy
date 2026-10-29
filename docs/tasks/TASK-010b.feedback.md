# TASK-010b feedback — Kamal deploy on the shared Hetzner host
Status: PARTIAL — Built; first deploy needs owner steps (DNS, nginx/certbot, GitHub secrets, billing).

## What I implemented
Switched the deploy shape from docker compose + Cloudflare Tunnel (ADR-015) to the owner's existing Kamal 2 pattern from DataVallis/postaja on the same host (ADR-019): Kamal configs for dev/prod, secret references, host nginx site files, GitHub deploy workflows with SHA smoke check, health returns `sha`.

## Files changed (path — why)
- `config/deploy.yml`, `config/deploy.dev.yml`, `config/deploy.prod.yml` — Kamal service, proxy behind host nginx, Postgres accessories (`thecrushguy-db`, `thecrushguy-prod-db`), APP_ENV/SITE_URL per destination
- `.kamal/secrets-common`, `.kamal/secrets.dev`, `.kamal/secrets.prod` — env references only
- `ops/nginx/dev.thecrushguy.com.conf`, `ops/nginx/thecrushguy.com.conf` — host nginx → 127.0.0.1:8080; www → apex 301
- `.github/workflows/deploy-dev.yml` (push to dev when `DEPLOY_DEV_ENABLED=true`, manual setup), `deploy-prod.yml` (on push to `main` once `DEPLOY_PROD_ENABLED=true`, manual setup run; ADR-021)
- `.github/workflows/ci.yml` — removed the GHCR `image` job (Kamal builds the image)
- `deploy/compose.server.yml` — deleted (superseded)
- `src/app/api/health/route.ts` (+ test) — `version` → `sha` for the smoke check
- `.dockerignore` — `**/node_modules`, `**/.env*`, `.kamal`, `ops` excluded (Release checklist)
- Docs: ADR-018/019/020, runbook rewritten for Kamal, CHEATSHEET, 02-ARCHITECTURE, DEVELOPMENT-RULES §13, HANDOFF, tasks/README, TASK-011 decisions, technical/README, README, docker-compose.yml comment

## Deviations
- Did not set kamal-proxy ports (`kamal proxy boot_config set …`): they are host-wide and already set by postaja; changing them from here could affect the other apps.
- Postgres image `postgres:16-alpine` (postaja uses pgvector; not needed here).

## New dependencies
None in the app. CI/deploy uses Kamal ~> 2.7 (gem, installed in the workflow), same as postaja.

## How to verify
`docs/runbooks/deploy-dev.md` §5 (exact URLs and expected text).

## Test results (this session, 2026-10-29 15:48)
```
lint: clean · typecheck: ✓ Types generated successfully · format: All matched files use Prettier code style!
 Test Files  3 passed (3)
      Tests  29 passed (29)
build: ✓ Compiled successfully · ✓ Generating static pages (7/7)
```
Config parse (Ruby ERB + YAML, dummy env): `config/deploy.yml`, `deploy.dev.yml`, `deploy.prod.yml`, `ci.yml`, `deploy-dev.yml`, `deploy-prod.yml` → all OK. Top-level Kamal keys identical to postaja's working config except names/hosts.

## Deliberate breaks
- Health returns `version` instead of `sha` → `× returns 200 when the database answers`, `Tests 1 failed | 1 passed (2)`; restored → `Tests 29 passed (29)` in the full suite.

## NOT RUN
- `kamal config` / `kamal deploy` — RubyGems is blocked in the agent environment; no SSH to servers by rule.
- Docker image build — no Docker daemon here; first "Deploy dev" run builds it.
- GitHub Actions — blocked by DataVallis org billing (run 40893619782 never started).

## Open questions / risks
- Dev is public (noindex only). Optional: Cloudflare Access or nginx basic auth on dev.
- Shared host resources: DB accessory memory 512m (dev) / 1g (prod).

## Suggested commit message
```
feat: deploy with Kamal on the shared Hetzner host (TASK-010b)
```
