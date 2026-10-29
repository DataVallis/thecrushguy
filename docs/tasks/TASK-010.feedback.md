# TASK-010 feedback
Status: PARTIAL — Built and tested locally; CI run on GitHub and deploy to dev pending (owner steps).

## What I implemented
Next.js 16.4 scaffold (App Router, TS strict, Turbopack, Cache Components + Partial Prefetching, typed routes), Tailwind 4 with placeholder tokens from the logo, self-hosted fonts, ESLint + Prettier, Drizzle + postgres.js connection (empty schema), locale routing (`[locale]`, proxy negotiation, `publishedLocales`), runtime indexing guard, `/api/health`, `/robots.txt`, placeholder home + 404, Vitest (unit + real-Postgres integration), Dockerfile (standalone, non-root, healthcheck), local `docker-compose.yml`, server `deploy/compose.server.yml` (app + Postgres + cloudflared), GitHub Actions CI + GHCR image, runbook, technical docs, agent deny-list (`.claude/settings.json`).

## Files changed (path — why)
- `package.json`, `package-lock.json` — deps + scripts (lint, typecheck, test, format, db:*)
- `next.config.ts` — standalone output, Cache Components, security headers
- `src/proxy.ts`, `src/lib/routing.ts` — locale redirect + noindex header
- `src/i18n/*` — locales, negotiation, dictionaries (en, de test)
- `src/lib/env.ts` — runtime env (local/dev/prod), indexability
- `src/lib/db/*`, `drizzle.config.ts` — DB client, ping, empty schema
- `src/app/[locale]/*` — root layout, placeholder home, 404
- `src/app/api/health/route.ts`, `src/app/robots.txt/route.ts`
- `src/app/globals.css`, `src/fonts/*` — tokens placeholder, OFL fonts
- `public/*` — favicon, apple icon, OG image, logo (from `design/logo/`)
- `*.test.ts`, `vitest.config.mts`, `test/server-only-stub.ts`
- `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `deploy/compose.server.yml`, `.github/workflows/ci.yml`, `.env.example`
- Docs: README, CLAUDE.md, AGENTS.md, HANDOFF, DEVELOPMENT-RULES (owner's file, §13 filled), 02-ARCHITECTURE, 03-DECISIONS (ADR-010…017), CHEATSHEET, technical/*, tasks/README, runbooks/deploy-dev.md, 08-ROADMAP

## Deviations from the task (and why)
- **next-intl not used** → native `[locale]` + dictionaries (ADR-012, accepted by owner).
- **Two locales** `en` + `de` (test locale, never indexed) as the task asked for "one test locale".
- **Deploy skeleton to dev not done by the agent** — servers are owner-only (DEVELOPMENT-RULES §1). Runbook provided.
- Caching via Cache Components instead of ISR timers (ADR-013).

## New dependencies (package@version — why)
- `drizzle-orm@0.45.4`, `postgres@3.4.9` — ORM + driver (ADR-011)
- dev: `drizzle-kit@0.31.11` (migrations), `vitest@5.0.5` (tests), `prettier@3` (format), `@types/node@22` (Node 22 runtime; vitest peer)
- Fonts vendored as files (OFL), packages not kept as dependencies.

## How to verify (command — expected result)
- `npm run lint` — no output, exit 0
- `npm run typecheck` — "Types generated successfully", exit 0
- `npm run format:check` — "All matched files use Prettier code style!"
- `DATABASE_URL=<test db> npm test` — 3 files, 29 tests passed
- `npm run build` — routes `/en`, `/de` static; `/api/health`, `/robots.txt` dynamic; Proxy active
- After deploy: `curl https://dev.thecrushguy.com/api/health` → `"status":"ok","db":"ok","env":"dev","version":"<sha>"`

## Test results (real outputs, this session, 2026-10-29)
```
2026-10-29T15:38:12+01:00
 Test Files  3 passed (3)
      Tests  29 passed (29)
```
(Postgres 16.15 local instance, `DATABASE_URL=postgres://tcg@127.0.0.1:5432/thecrushguy_test`.)
Lint clean · typecheck clean · format clean · build "✓ Compiled successfully", 7/7 static pages.

Standalone server smoke test (`APP_ENV=dev`, earlier run this session):
```
/ (Accept-Language de)  → 307 -> http://127.0.0.1:3077/en
/en                      → 200, x-robots-tag: noindex, nofollow, X-Frame-Options: DENY, <html lang="en">
/de                      → <meta name="robots" content="noindex, nofollow"/>
/api/health              → 200, cache-control: no-store, {"status":"ok","db":"ok","env":"dev","version":"unknown"}
/robots.txt              → User-agent: * / Disallow: /
font                     → 200 font/woff2 41344B from /_next/static/media; 0 references to fonts.googleapis
```

## Deliberate breaks
1. Health: DB pointed to a closed port → `× returns 200 when the database answers`, `Tests 1 failed | 1 passed (2)`; restored → passing.
2. Indexing guard: `isIndexable` changed to `appEnv() !== "local"` → `× APP_ENV="dev" → dev, indexable=false`, `Tests 1 failed | 6 passed (7)`; restored → `Tests 7 passed (7)`.
3. Unplanned but useful: local Postgres stopped mid-session → full suite `Tests 1 failed | 28 passed (29)` (health 503) — a missing DB fails, never skips.

## NOT RUN
- Docker image build/run — no Docker daemon in the agent environment; first CI `image` job will prove it.
- CI on GitHub — runs after push.
- Deploy to dev + smoke check on dev — owner (runbook).
- Lighthouse/a11y — placeholder page only; starts with TASK-012.

## Docs updated
See "Files changed". HANDOFF lists owner actions and latest numbers (TASK-015 / ADR-017).

## Open questions / risks
- Mailbox host for hi@thecrushguy.com (ADR-017).
- `cloudflare/cloudflared:latest` must be pinned before deploy.
- `metadataBase` uses build-time `SITE_URL` (Dockerfile ARG, default prod URL) — harmless on dev (noindex), revisit in TASK-014.

## Suggested commit message
```
chore: scaffold Next.js 16 app with Postgres, CI and deploy skeleton (TASK-010)
```
