# CHEATSHEET (owner operator sheet — locations only, NEVER secret values)

## URLs
| What | URL |
|---|---|
| Repo | https://github.com/DataVallis/thecrushguy (default branch `dev`) |
| dev | https://dev.thecrushguy.com (auto-deploy on push to `dev` once `DEPLOY_DEV_ENABLED=true`) |
| dev health | https://dev.thecrushguy.com/api/health → `"status":"ok"`, `"db":"ok"`, `"sha"` = last commit on dev |
| prod | https://thecrushguy.com (auto-deploy on merge to `main` once `DEPLOY_PROD_ENABLED=true`, ADR-021) |

## Host
| Env | Host | SSH user | Notes |
|---|---|---|---|
| dev + prod | Hetzner VM `91.99.191.8` (GitHub variables `DEV_HOST` / `PROD_HOST`) | `deploy` | shared with postaja and others; host nginx + certbot → kamal-proxy 127.0.0.1:8080; nginx files in `ops/nginx/` |

## GitHub variables and secrets
| Name | Kind | Where | Used by |
|---|---|---|---|
| `DEV_HOST` / `PROD_HOST` | variable | repo / env `prod` | Kamal server address |
| `DEPLOY_DEV_ENABLED` / `DEPLOY_PROD_ENABLED` | repo variables | Actions → Variables | turn on auto-deploy for dev / prod (`true`) |
| `ADMIN_EMAILS` | repo variable | Actions → Variables | admin magic-link allowlist (TASK-011b) |
| `DEPLOY_SSH_KEY` | env secret | Environments → dev / prod | CI → server SSH |
| `DEV_SSH_KNOWN_HOSTS` / `PROD_SSH_KNOWN_HOSTS` | env secret | Environments → dev / prod | pinned host key |
| `POSTGRES_PASSWORD` | env secret | Environments → dev / prod | DB accessory |
| `DATABASE_URL` | env secret | Environments → dev / prod | `postgres://tcg:<pw>@thecrushguy-db:5432/thecrushguy_dev` (prod: `thecrushguy-prod-db`, `thecrushguy_prod`) |
| `SMTP_PASSWORD` | env secret (TASK-011b) | Environments → dev / prod | password of hi@thecrushguy.com on `mail.datavallis.com` (ADR-018) |
| `GITHUB_TOKEN` | automatic | — | push image to GHCR |

## Commands
See `docs/runbooks/deploy-dev.md` §6 (deploy, logs, rollback, DB shell).

## Env var names (values never here)
`APP_ENV`, `SITE_URL`, `DATABASE_URL`, `DATABASE_POOL_MAX`, `GIT_SHA` (build arg) — see `.env.example`.
`RUN_MIGRATIONS` (clear, `1` in config/deploy.yml). Planned: `ADMIN_EMAILS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` (011b), `LINK_ENCRYPTION_KEY` (011d, GitHub env secret).
