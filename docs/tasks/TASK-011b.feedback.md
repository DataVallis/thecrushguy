# TASK-011b feedback — magic-link admin auth
Status: DONE (Built) — Live on dev after the merge deploy + smoke check

## What I implemented
- Migration `0002_admin_auth`: `admin_login_tokens`, `admin_sessions`, `auth_rate_events` (hashes only, additive → backward compatible).
- `src/lib/auth/service.ts`: request link (validation, rate limits, allowlist, mail, cleanup on mail failure), consume token (atomic single use, allowlist re-check, burns other pending links, prunes), session lookup, logout.
- `src/lib/auth/mail.ts`: nodemailer SMTP sender (587 STARTTLS required / 465 TLS), console link for `APP_ENV=local` without SMTP, loud failure elsewhere.
- `src/lib/auth/session.ts` (DAL: `requireAdmin`, cookie set/clear, client IP), `src/lib/auth/gate.ts` + `src/proxy.ts` (early redirect, no-store, no-referrer, noindex for /admin).
- `src/app/admin/*`: own root layout, login page, verify (confirm button) page, placeholder dashboard with sign-out, server actions.
- Deploy: SMTP clear env + `SMTP_PASSWORD`/`ADMIN_EMAILS` as Kamal secrets, workflows pass them, smoke checks for `/admin` → login.

## Files changed
- `drizzle/0002_admin_auth.sql`, `drizzle/meta/*` — migration
- `src/lib/db/schema.ts`, `src/lib/db/schema.test.ts` — new tables; table/migration count in the existing test
- `src/lib/auth/*`, `src/app/admin/*`, `src/proxy.ts` — feature
- `test/smtp-catcher.ts` — in-process SMTP server for tests
- `config/deploy.yml`, `.kamal/secrets.dev`, `.kamal/secrets.prod`, `.github/workflows/deploy-{dev,prod}.yml`, `.env.example` — config
- `package.json`, `package-lock.json` — `nodemailer`, `zod`, `@types/nodemailer`
- docs: `03-DECISIONS.md` (ADR-022), `technical/auth.md`, `technical/README.md`, `CHEATSHEET.md`, `02-ARCHITECTURE.md`, `tasks/README.md`, `HANDOFF.md`

## Deviations
- Verify step needs a button click (POST) instead of logging in on GET — protects single-use links from mail scanners (ADR-022).
- Mailpit replaced by an in-process SMTP catcher (ADR-022): no docker daemon / external binary in the agent environment; the real transport is still tested.
- Admin UI strings are inline English, not i18n dictionaries (ADR-022; /admin is unlocalized per ADR-012).

## New dependencies
`nodemailer@^10.3.1`, `zod@^4.6.7` (approved 2026-10-29), `@types/nodemailer@^8.0.2` (dev, types only).

## How to verify
- `npm test` → 94 passed. On dev: https://dev.thecrushguy.com/admin → 307 to `/admin/login`; request a link for the `ADMIN_EMAILS` address → mail from hi@thecrushguy.com → "Sign in to admin" → "Signed in as …"; same link again → "That link is invalid, already used or expired".

## Test results (2026-10-29 16:41 CET, this session)
```
lint ok · typecheck ✓ Types generated successfully · format: All matched files use Prettier code style!
 Test Files  8 passed (8)
      Tests  94 passed (94)
   Start at  16:41:46
   Duration  3.96s
build: ✓ Compiled successfully · ✓ Generating static pages (10/10)
```
End to end over HTTP (standalone build, `APP_ENV=dev`, SMTP → in-process catcher, real Postgres):
```
GET /admin (no cookie)            → 307 location: /admin/login; no-store; no-referrer; noindex
POST login (allowed, mixed case)  → 303 /admin/login?sent=1
POST login (stranger)             → 303 /admin/login?sent=1   (identical)
mails: 1 [['owner@example.com']]
GET verify link twice (scanner)   → 200, token still unused (1 unused / 1 total)
POST verify                       → 303 /admin, Set-Cookie tcg_admin; Path=/admin; HttpOnly; SameSite=lax
GET /admin with cookie            → "Signed in as owner@example.com"
POST verify again (replay)        → 303 /admin/login?error=link
forged cookie                     → streamed redirect to /admin/login, no data
cross-origin POST                 → 500 "Invalid Server Actions request" (Next origin check)
logout                            → cookie cleared, admin_sessions = 0, old cookie no longer works
```
Fixed during the run: `new Date()` during prerender in `/admin` → `await connection()` in `currentAdmin()`; log clean afterwards.

## Deliberate breaks (all restored → 28/28 auth tests passing)
1. `used_at is null` removed from consume → 3 failed (single use, concurrent use, burn other links).
2. Allowlist re-check removed from `sessionEmail` → 1 failed (revocation).
3. Rate-limit return disabled → 3 failed (email limit, probe counting, IP limit).
4. `/admin` added to public gate paths → 1 failed (proxy gate).

## NOT RUN
- Real SMTP to mail.datavallis.com and the Kamal deploy — happen on merge (deploy smoke check covers `/admin`; owner confirms the mail arrives).
- Mailpit — not available here (see deviations).

## Open questions / risks
- `SMTP_PORT` defaults to 587; if the mail server only offers 465, set the GitHub variable `SMTP_PORT=465`.
- `Secure` cookie flag depends on `SITE_URL` being https (true on dev/prod).

## Suggested commit message
`feat: magic-link admin auth (TASK-011b)`
