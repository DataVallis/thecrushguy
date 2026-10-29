# Technical docs — maintenance map

Which doc covers which code. Every PR that changes an area updates its doc (DEVELOPMENT-RULES §7).

| Area | Code | Doc | Status |
|---|---|---|---|
| Routing + i18n | `src/proxy.ts`, `src/lib/routing.ts`, `src/i18n/*`, `src/app/[locale]/layout.tsx` | `routing-i18n.md` | Built |
| Runtime env + indexing guard | `src/lib/env.ts`, `src/proxy.ts`, `src/app/robots.txt/route.ts` | `routing-i18n.md` §Indexing | Built |
| Database | `src/lib/db/*`, `drizzle.config.ts`, `drizzle/` | `database.md` (TASK-011) | Built (connection only) |
| Health | `src/app/api/health/route.ts` | this file below | Built |
| Fonts + tokens | `src/app/globals.css`, `src/fonts/` | `design-system.md` (TASK-003) | Built (placeholder tokens) |
| Build + deploy | `Dockerfile`, `.github/workflows/ci.yml`, `deploy/compose.server.yml` | `docs/runbooks/deploy-dev.md` | Built |

## Health endpoint
`GET /api/health` → 200 `{"status":"ok","db":"ok","env":"<APP_ENV>","version":"<GIT_SHA>"}` when `select 1` succeeds within 2 s; otherwise 503 `{"status":"error","db":"down",...}` without error details. Always `Cache-Control: no-store`. Used by the Docker `HEALTHCHECK` and smoke checks.
