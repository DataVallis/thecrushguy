# Admin authentication (magic link)

Status: **Live on dev** (TASK-011b, PR #4, deploy smoke check green 2026-10-29). Decisions: ADR-017, ADR-018, ADR-020, ADR-022.

## Flow
1. `GET /admin/login` — email form (server action `requestLinkAction`, works without JavaScript).
2. POST → `requestLoginLink()` (`src/lib/auth/service.ts`):
   - normalizes (trim + lowercase) and validates the email (zod, ≤ 254 chars); invalid → nothing stored;
   - records two rate events and refuses when the email bucket has > 3 events in 15 min or the IP bucket > 10 in 1 h;
   - if the address is in `ADMIN_EMAILS`: stores `sha256(token)` with a 15-minute expiry and mails `SITE_URL/admin/auth/verify?token=<raw>`; if the mail fails the token row is deleted and `[auth] login mail failed: <reason>` is logged (no address, no link).
   - The response is always `303 → /admin/login?sent=1` ("If this address is allowed, a sign-in link is on its way").
3. `GET /admin/auth/verify?token=…` renders a confirm button only (link scanners can't consume the token).
4. POST → `consumeLoginToken()`: one atomic `UPDATE … WHERE used_at IS NULL AND expires_at > now RETURNING email`, allowlist re-check, other pending links of the address burned, expired sessions/old tokens pruned, new session (`sha256(cookie)`, 7 days). Cookie `tcg_admin` is set and the browser goes to `/admin`. Invalid/used/expired → `/admin/login?error=link`.
5. Every admin page and action calls `requireAdmin()` (`src/lib/auth/session.ts`): `await connection()`, read cookie, `sessionEmail()` (hash lookup, not expired, still allowlisted) or redirect to `/admin/login`.
6. Sign out → `endSession()` deletes the session row and the cookie.

## Defence in depth
- `src/proxy.ts`: anonymous requests (no `tcg_admin` cookie) to any `/admin` path except `/admin/login` and `/admin/auth/verify` get `307 → /admin/login` before rendering (`src/lib/auth/gate.ts`). This is only an early redirect; the DB check in `requireAdmin()` is the protection.
- All `/admin` responses: `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer` (the verify URL carries a token).
- Server actions reject cross-origin POSTs (Next.js checks `Origin` against the forwarded host).
- Only hashes of login tokens and session cookies are stored; rate-limit buckets are hashes too.

## Tables (migration `drizzle/0002_admin_auth.sql`)
| Table | Columns | Notes |
|---|---|---|
| `admin_login_tokens` | email, token_hash (unique, hex check), expires_at, used_at, created_at | rows older than 24 h pruned on login |
| `admin_sessions` | id (uuid), email, token_hash (unique), expires_at, created_at | expired rows pruned on login |
| `auth_rate_events` | bucket, at | rows older than 24 h pruned on each request |

## Configuration
| Env | Where | Notes |
|---|---|---|
| `ADMIN_EMAILS` | GitHub variable → Kamal secret | comma-separated; empty = nobody can sign in |
| `SMTP_HOST`, `SMTP_USER`, `MAIL_FROM` | clear in `config/deploy.yml` | `mail.datavallis.com`, `hi@thecrushguy.com` |
| `SMTP_PORT` | optional GitHub variable | default 587 (STARTTLS required); 465 = implicit TLS |
| `SMTP_PASSWORD` | GitHub env secret (dev / prod) | |
| `SITE_URL` | `config/deploy.<dest>.yml` | link base and `Secure` cookie flag |

Local: leave `SMTP_HOST` empty → the link is printed in the `npm run dev` console. Outside `local` a missing or half SMTP config makes every send fail loudly in the log.

## Tests
- `src/lib/auth/service.test.ts` — real Postgres: allowlist, fail-closed allowlist, invalid input, both rate limits incl. window edge, hashes only, mail failure cleanup, single use, concurrent use, expiry boundaries (−1 ms / exact), revocation, token/session separation, logout of B doesn't affect A.
- `src/lib/auth/mail.test.ts` — real nodemailer transport against `test/smtp-catcher.ts`.
- `src/lib/auth/gate.test.ts` — proxy gate paths, `ADMIN_EMAILS` parsing, SMTP config and mail escaping.
