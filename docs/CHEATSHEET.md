# CHEATSHEET (owner operator sheet — locations only, NEVER secret values)

| Item | Where / value |
|---|---|
| Repo | https://github.com/DataVallis/thecrushguy (default branch `dev`) |
| CI | GitHub Actions → `.github/workflows/ci.yml` |
| Images | `ghcr.io/datavallis/thecrushguy:dev`, `:prod`, `:<sha>` |
| dev URL | https://dev.thecrushguy.com (planned; protect with Cloudflare Access) |
| prod URL | https://thecrushguy.com (planned) |
| Health | `/api/health` → `{status, db, env, version}` (version = deployed git SHA) |
| Server env files | `/opt/thecrushguy/deploy/.env.<env>`, `.env.<env>.db`, `.env.<env>.tunnel` on the Hetzner host (mode 600) |
| DB password | in `.env.<env>.db` on the server + owner's password manager |
| Tunnel token | Cloudflare Zero Trust → Tunnels → `tcg-<env>`; copy in `.env.<env>.tunnel` |
| Mailbox | hi@thecrushguy.com — host: OPEN (ADR-017); SMTP credentials will live in `.env.<env>` |
| Deploy / rollback | `docs/runbooks/deploy-dev.md` §3 / §5 |

## Env var names (values never here)
`APP_ENV`, `SITE_URL`, `DATABASE_URL`, `DATABASE_POOL_MAX`, `GIT_SHA` (set by CI build arg) — see `.env.example`.
Planned (TASK-011): `ADMIN_EMAILS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `SESSION_SECRET`.
