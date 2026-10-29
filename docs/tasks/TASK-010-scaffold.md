# TASK-010 — Project scaffold + deploy skeleton

- Blocked by: brand name (for repo/app name; may use codename) · Read: `02-ARCHITECTURE.md`

## Scope
Next.js (App Router, TS strict), Tailwind with tokens placeholder, ESLint/Prettier, Postgres via Docker Compose, ORM (write ADR choosing Prisma vs Drizzle), next-intl with `en` + one test locale, health endpoint, CI (lint, typecheck, test, build), Dockerfile, deploy skeleton to dev on Hetzner behind Cloudflare.

## Out of scope
Any product page beyond a placeholder home.

## Done when
CI green, dev URL serves the placeholder with `noindex`, HANDOFF updated, runbook for deploy in `docs/runbooks/`.
