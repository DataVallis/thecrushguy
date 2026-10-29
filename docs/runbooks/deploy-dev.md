# Runbook — first deploy to dev (and later prod) on the shared Hetzner host

Owner-only steps (DEVELOPMENT-RULES §1: servers, secrets, GitHub settings). Same host and pattern as DataVallis/postaja (ADR-019).
Host: Hetzner VM `91.99.191.8`, SSH user `deploy`, host nginx + certbot → kamal-proxy on `127.0.0.1:8080` (already configured by postaja).

## 1. DNS (Cloudflare)
1. `A dev.thecrushguy.com → 91.99.191.8`, `A thecrushguy.com → 91.99.191.8`, `A www.thecrushguy.com → 91.99.191.8`.
2. Start with **DNS only (grey cloud)** so certbot's HTTP challenge reaches nginx. After certificates exist you may switch to **Proxied (orange)** with SSL mode **Full (strict)**.
3. Mail for hi@thecrushguy.com on `mail.datavallis.com` (ADR-018): MX, SPF (`v=spf1 a:mail.datavallis.com -all` or your server's standard include), DKIM (key from the mail server), DMARC (`v=DMARC1; p=quarantine; rua=mailto:hi@thecrushguy.com`).

## 2. nginx site on the host (once per hostname)
```
sudo cp ops/nginx/dev.thecrushguy.com.conf /etc/nginx/sites-available/
sudo ln -s ../sites-available/dev.thecrushguy.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d dev.thecrushguy.com
```
Prod later: same with `ops/nginx/thecrushguy.com.conf` and `sudo certbot --nginx -d thecrushguy.com -d www.thecrushguy.com`.

## 3. GitHub settings (repo DataVallis/thecrushguy)
- Settings → General → Default branch `dev`.
- Billing: Actions must be able to run (spending limit / payment method of the DataVallis org).
- Settings → Secrets and variables → Actions → **Variables**: `DEV_HOST` = `91.99.191.8`; `DEPLOY_DEV_ENABLED` = `true` (after the first successful manual deploy); `ADMIN_EMAILS` (used from TASK-011b).
- Settings → Environments → **dev** → secrets:
  - `DEPLOY_SSH_KEY` — the `deploy` user's private key (can be the same dedicated deploy key postaja uses)
  - `DEV_SSH_KNOWN_HOSTS` — output of `ssh-keyscan -t ed25519 91.99.191.8`
  - `POSTGRES_PASSWORD` — `openssl rand -hex 24`
  - `DATABASE_URL` — `postgres://tcg:<POSTGRES_PASSWORD>@thecrushguy-db:5432/thecrushguy_dev`
- Keep your own copy of every secret (GitHub never shows it again).

## 4. First deploy
Actions → **Deploy dev** → Run workflow → branch `dev`, **setup = true**. This boots the DB accessory and the app (`kamal setup -d dev`).
Then set `DEPLOY_DEV_ENABLED=true`: every push/merge to `dev` deploys automatically.

## 5. Verify (exact things to look for)
- https://dev.thecrushguy.com/api/health → `"status":"ok"`, `"db":"ok"`, `"env":"dev"`, `"sha":"<last commit on dev>"`
- https://dev.thecrushguy.com/ → redirects to `/en`, page shows "I tried every AI crush, so you don't have to."
- `curl -sI https://dev.thecrushguy.com/en | grep -i x-robots` → `noindex, nofollow`
- https://dev.thecrushguy.com/robots.txt → `Disallow: /`
The workflow's smoke check verifies the same automatically.

## 6. Everyday commands (owner's machine, env vars exported)
| Task | Command |
|---|---|
| Deploy dev manually | `kamal deploy -d dev` |
| Logs | `kamal app logs -d dev -f` |
| Rollback | `kamal app containers -d dev` → `kamal rollback <version> -d dev` |
| DB shell | `kamal accessory exec db -d dev --interactive --reuse "psql -U tcg thecrushguy_dev"` |

## 7. Prod (when the owner decides)
GitHub environment **prod** with `PROD_HOST`, `DEPLOY_SSH_KEY`, `PROD_SSH_KNOWN_HOSTS`, `POSTGRES_PASSWORD` (new), `DATABASE_URL=postgres://tcg:<pw>@thecrushguy-prod-db:5432/thecrushguy_prod`. Actions → **Deploy prod** → branch `main`, setup = true the first time; then set repo variable `DEPLOY_PROD_ENABLED=true` — from then on **every merge to `main` deploys prod automatically** (ADR-021). Backups before prod go live (separate task).

## Migrations
From TASK-011a on, migrations run at container start (`RUN_MIGRATIONS=1`, same pattern as postaja) and must be backward compatible (expand → migrate → contract).
