# The Crush Guy (thecrushguy.com)

Independent directory, review and comparison site for AI companion apps. "I tried every AI crush, so you don't have to."
Project docs: start at `docs/HANDOFF.md`. Agents: read `CLAUDE.md` first.

## Stack

Next.js 16.4 (App Router, TypeScript strict, Cache Components) · Tailwind 4 · PostgreSQL 16 · Drizzle ORM · Vitest · Docker (standalone) · Kamal 2 on Hetzner (shared host). See `docs/02-ARCHITECTURE.md` and ADR-010…020.

## Local development

```
cp .env.example .env.local
docker compose up -d db          # Postgres 16 on 127.0.0.1:5432
npm ci
npm run dev                      # http://localhost:3000 → redirects to /en
```

## Checks (same as CI)

```
npm run lint
npm run typecheck
npm run format:check
DATABASE_URL=postgres://tcg:tcg_local_only@localhost:5432/thecrushguy npm test   # integration tests use the real DB
npm run build
```

## Endpoints so far

| Path          | What                                                        |
| ------------- | ----------------------------------------------------------- |
| `/`           | 307 → `/{locale}` (Accept-Language, published locales only) |
| `/en`         | Placeholder home (TASK-012 replaces it)                     |
| `/de`         | Scaffold test locale, always `noindex`                      |
| `/api/health` | `{status, db, env, sha}`; 503 if DB is down                 |
| `/robots.txt` | Allow only when `APP_ENV=prod`                              |

All non-prod responses carry `X-Robots-Tag: noindex, nofollow`.

## Deploy

Owner only — `docs/runbooks/deploy-dev.md`.
