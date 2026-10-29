# Technical docs — maintenance map

Which doc covers which code. Every PR that changes an area updates its doc (DEVELOPMENT-RULES §7).

| Area | Code | Doc | Status |
|---|---|---|---|
| Routing + i18n | `src/proxy.ts`, `src/lib/routing.ts`, `src/i18n/*`, `src/app/[locale]/layout.tsx` | `routing-i18n.md` | Live on dev |
| Runtime env + indexing guard | `src/lib/env.ts`, `src/proxy.ts`, `src/app/robots.txt/route.ts` | `routing-i18n.md` §Indexing | Live on dev |
| Database + migrations + link encryption | `src/lib/db/*`, `src/lib/crypto/*`, `src/instrumentation*.ts`, `drizzle.config.ts`, `drizzle/` | `database.md` | Live on dev |
| Admin auth (magic link) | `src/lib/auth/*`, `src/app/admin/*`, `src/proxy.ts` (admin gate), `test/smtp-catcher.ts` | `auth.md` | Live on dev |
| Admin console (apps, categories, publish flow, audit) | `src/app/admin/(console)/*`, `src/lib/admin/*` | `admin.md` | Live on dev |
| Outbound redirect + clicks | `src/app/go/[slug]/route.ts`, `src/lib/go/*` | `go-redirect.md` | Live on dev |
| Age gate | `src/lib/age-gate/*`, `src/app/api/age-gate/route.ts` | `age-gate.md` | Built |
| Health | `src/app/api/health/route.ts` | this file below | Live on dev |
| Fonts + tokens | `src/app/globals.css`, `src/fonts/`, `design/logo/generate.py` | `design-system.md` (TASK-003); fonts per ADR-023 | Built (Fraunces + Onest; placeholder colour tokens) |
| Build + deploy | `Dockerfile`, `.github/workflows/*.yml`, `config/deploy*.yml`, `.kamal/`, `ops/nginx/` | `docs/runbooks/deploy-dev.md` | Live on dev |

## Health endpoint
`GET /api/health` → 200 `{"status":"ok","db":"ok","env":"<APP_ENV>","sha":"<GIT_SHA>"}` when `select 1` succeeds within 2 s; otherwise 503 `{"status":"error","db":"down",...}` without error details. Always `Cache-Control: no-store`. Used by the Docker `HEALTHCHECK`, kamal-proxy and the deploy smoke check (compares `sha` with the pushed commit).
