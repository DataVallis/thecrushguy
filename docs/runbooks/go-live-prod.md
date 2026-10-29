# Runbook — from dev to prod (go-live checklist)

Who does what: **Owner** = David (accounts, secrets, server, legal, merge to `main`). **Agent** = code/docs tasks, merged to `dev` (mode B).
Prod = https://thecrushguy.com, same Hetzner host as dev (ADR-019), deployed automatically on every merge to `main` once enabled (ADR-021).
Tick items in order; each block says how to verify.

---

## 0. What prod needs before anyone may see it (launch blockers)

| # | Item | Who | Status |
|---|---|---|---|
| 0.1 | Public pages v1: home, category lists, app pages, methodology, about, contact, privacy, terms, affiliate disclosure, imprint (TASK-012) | Agent | Planned |
| 0.2 | SEO foundation: sitemaps, canonical/hreflang, schema (TASK-014) | Agent | Planned |
| 0.3 | Imprint data for Data Vallis d.o.o. (address, registration no., VAT no.) and privacy-policy facts (ADR-007) | Owner → agent | Done 2026-10-29 |
| 0.4 | ~~Lawyer answer on 07-LEGAL §3~~ — dropped by owner (ADR-027); conservative default region list stays | — | Dropped |
| 0.5 | First real listings: TASK-006 research → CSV import → every app's checklist done → publish | Agent + owner review | Planned |
| 0.6 | Affiliate accounts approved (networks/direct programs) and links entered in prod admin | Owner | Open |
| 0.7 | Backups of the prod DB + one restore drill (DEVELOPMENT-RULES §9) | Agent (script) + owner (server) | Planned |
| 0.8 | Cloudflare proxy + location headers (§2) — without them NSFW sections stay hidden for everyone | Owner | Open |
| 0.9 | Analytics (privacy-friendly) + Google Search Console verification | Owner + agent | Planned |

Until 0.1–0.7 are done, prod may be deployed but must not be announced.

---

## 1. GitHub: prod environment (owner, once)

Settings → Environments → **New environment `prod`** (optional: "Required reviewers" = you, so every prod deploy waits for your click).

Environment **secrets** (`prod`) — every value NEW, never copied from dev; keep each in your password manager:
| Name | Value |
|---|---|
| `DEPLOY_SSH_KEY` | private key of the `deploy` user (same as dev is fine) |
| `PROD_SSH_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 91.99.191.8` |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` |
| `DATABASE_URL` | `postgres://tcg:<POSTGRES_PASSWORD>@thecrushguy-prod-db:5432/thecrushguy_prod` |
| `SMTP_PASSWORD` | password of hi@thecrushguy.com (same mailbox as dev) |
| `LINK_ENCRYPTION_KEY` | `openssl rand -base64 32` — **different from dev**; losing it means re-entering every affiliate link |

Environment **variables** (`prod`): `PROD_HOST` = `91.99.191.8`.
Repo variables already used by dev also apply to prod: `ADMIN_EMAILS`, optional `SMTP_PORT`, optional `AGE_GATE_RESTRICTED_REGIONS` (when the lawyer has answered; agent wires it into deploy config at that point).

Verify: Settings → Environments → prod lists the six secret names and `PROD_HOST`.

## 2. Cloudflare (owner) — DNS, proxy, location headers

Order matters: certificates first, then proxy, then lock the origin.

1. **DNS** (Cloudflare → thecrushguy.com → DNS): `A thecrushguy.com → 91.99.191.8`, `A www → 91.99.191.8` (dev already exists). Start **DNS only (grey)**.
2. **Server: nginx + certificate for prod** (SSH to the host):
   ```
   cd ~/thecrushguy && git pull                     # or copy ops/ from the repo
   sudo ops/nginx/cloudflare-ips.sh --dry-run       # look at what it will write
   sudo ops/nginx/cloudflare-ips.sh                 # writes the two Cloudflare snippets, nginx -t, reload
   sudo cp ops/nginx/thecrushguy.com.conf /etc/nginx/sites-available/
   sudo ln -s ../sites-available/thecrushguy.com.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d thecrushguy.com -d www.thecrushguy.com
   ```
   Dev's nginx file already exists and was changed by certbot — **don't re-copy it**; open `/etc/nginx/sites-available/dev.thecrushguy.com.conf` and add, inside every `server { … }` block that contains `proxy_pass`:
   `include snippets/cloudflare-realip.conf;` → `sudo nginx -t && sudo systemctl reload nginx`.
3. **SSL mode**: Cloudflare → SSL/TLS → Overview → **Full (strict)**.
4. **Proxy on**: DNS → click the grey cloud of `thecrushguy.com`, `www` and `dev` → **Proxied (orange)**.
5. **Location headers**: Cloudflare → your site → **Rules → Settings → Managed Transforms** → turn **on "Add visitor location headers"** (adds `cf-ipcountry`, `cf-region-code`, …). Leave **"Remove visitor IP headers" OFF** — the origin needs `CF-Connecting-IP` for the real visitor IP.
6. **Lock the origin** (after 4 works): in each thecrushguy server block (dev + prod, all blocks with `proxy_pass`) uncomment
   `if ($from_cloudflare = 0) { return 403; }` → `sudo nginx -t && sudo systemctl reload nginx`.
   Why: otherwise anyone can call `91.99.191.8` directly with a fake `CF-IPCountry` and bypass the age-gate region rule.
7. **Keep ranges fresh**: `sudo crontab -e` → `17 4 1 * * /home/deploy/thecrushguy/ops/nginx/cloudflare-ips.sh >/dev/null` (adjust the path).

Verify:
- `curl -sI https://dev.thecrushguy.com/en | grep -i "^server\|cf-ray"` → `server: cloudflare` and a `cf-ray` line.
- From your laptop: `curl -sk -o /dev/null -w '%{http_code}\n' --resolve dev.thecrushguy.com:443:91.99.191.8 https://dev.thecrushguy.com/en` → `403` after step 6 (direct origin access refused).
- Admin login still works, and a test click on `/go/...` shows a different `ip_hash` from your phone vs. laptop (not one shared Cloudflare IP).

## 3. Release flow (every release)

1. Agent finishes tasks on `dev` (CI green, dev deploy + smoke check green).
2. Owner checks dev (the feedback file of each task lists exact things to look at).
3. Owner opens a PR **`dev → main`** on GitHub: https://github.com/DataVallis/thecrushguy/compare/main...dev → title "Release YYYY-MM-DD" → CI must be green → **Merge** (merge commit, not squash, so `main` keeps dev's history).
4. The merge triggers **Deploy prod** once `DEPLOY_PROD_ENABLED=true` (§4). Its smoke check fails the run if the deployed SHA, DB, home page, indexability (prod must NOT send `noindex`) or the admin redirect are wrong.

Migrations run at container start and are always backward compatible (expand → migrate → contract), so the previous version keeps working while the new one starts.

## 4. First prod deploy (owner, once — after §1 and §2.1–2.3)

1. Create `main` if it doesn't exist: GitHub → branches → New branch `main` from `dev`.
2. Actions → **Deploy prod** → Run workflow → branch **main**, **setup = true** (boots the prod DB accessory + app; `kamal setup -d prod`).
3. When green: Settings → Secrets and variables → Actions → Variables → `DEPLOY_PROD_ENABLED` = `true`. From now on every merge to `main` deploys prod.

Verify:
- https://thecrushguy.com/api/health → `"status":"ok"`, `"db":"ok"`, `"env":"prod"`, `"sha"` = last commit on `main`.
- https://www.thecrushguy.com → 301 to https://thecrushguy.com.
- `curl -sI https://thecrushguy.com/en | grep -i x-robots` → **nothing** (prod is indexable); https://thecrushguy.com/robots.txt → `Allow`.
- https://thecrushguy.com/admin → login page; sign in with your address (link arrives from hi@thecrushguy.com).
- In prod admin, add one affiliate link → saves without "LINK_ENCRYPTION_KEY is not configured".

## 5. Data on prod

Dev and prod have separate databases — nothing is copied automatically, and dev data is test data. Prod content is entered in **prod admin** (or imported there with the same CSV via `/admin/import`). Affiliate links are encrypted per environment, so they must be entered on prod itself.

## 6. Rollback (owner's machine, env vars from the prod environment exported)

| Task | Command |
|---|---|
| List versions | `kamal app containers -d prod` |
| Roll back | `kamal rollback <version> -d prod` |
| Logs | `kamal app logs -d prod -f` |
| DB shell | `kamal accessory exec prod-db -d prod --interactive --reuse "psql -U tcg thecrushguy_prod"` |

A rollback is safe because migrations are backward compatible. Then fix forward on `dev` and release again.
