# Runbook — deploy to dev (Hetzner + Cloudflare)

Owner-only. Agents never run these steps (DEVELOPMENT-RULES: servers, secrets, environments are the owner's).
Same steps for prod with `APP_ENV=prod`, `IMAGE_TAG=prod` (there is no uat, ADR-016) and a separate tunnel, DB and env files.

## 0. One-time prerequisites
- Hetzner VPS with Docker + Docker Compose plugin. (Existing server is fine; this stack uses its own compose project `tcg-dev` and its own network/volume.)
- Domain `thecrushguy.com` on Cloudflare (DNS proxied).
- GitHub repo with Actions enabled; image goes to `ghcr.io/<owner>/<repo>`. On the server: `docker login ghcr.io` with a token that has `read:packages`.

## 1. Cloudflare Tunnel (no open ports)
1. Cloudflare dashboard → Zero Trust → Networks → Tunnels → Create tunnel `tcg-dev` (cloudflared).
2. Public hostname: `dev.thecrushguy.com` → Service `http://app:3000`.
3. Copy the tunnel token → server file `deploy/.env.dev.tunnel` as `TUNNEL_TOKEN=...` (never commit).
4. Recommended: Zero Trust → Access → protect `dev.thecrushguy.com` (owner email only). Dev must not be public.
5. Pin the `cloudflare/cloudflared` image to a specific version in `compose.server.yml` instead of `latest`.

## 2. Env files on the server (`/opt/thecrushguy/deploy/`)
`.env.dev` (app):
```
APP_ENV=dev
SITE_URL=https://dev.thecrushguy.com
DATABASE_URL=postgres://tcg:<DB_PASSWORD>@db:5432/thecrushguy
DATABASE_POOL_MAX=10
```
`.env.dev.db` (postgres container):
```
POSTGRES_USER=tcg
POSTGRES_PASSWORD=<DB_PASSWORD>
POSTGRES_DB=thecrushguy
```
Generate the password on the server (`openssl rand -base64 32`). Record only its LOCATION in `docs/CHEATSHEET.md`, never the value.

## 3. Deploy
```
cd /opt/thecrushguy/deploy
export APP_ENV=dev GH_REPO=datavallis/thecrushguy IMAGE_TAG=dev   # lowercase; or a commit sha for pinning
docker compose -f compose.server.yml pull
docker compose -f compose.server.yml up -d
```
(From TASK-011 on: run DB migrations before `up -d` — the command will be added here with the migration runner.)

## 4. Verify
```
docker compose -f compose.server.yml ps          # app healthy, db healthy, tunnel running
curl -s https://dev.thecrushguy.com/api/health   # {"status":"ok","db":"ok","env":"dev","version":"<sha>"}
curl -sI https://dev.thecrushguy.com/en | grep -i x-robots-tag   # noindex, nofollow
curl -s https://dev.thecrushguy.com/robots.txt   # Disallow: /
```

## 5. Rollback
`export IMAGE_TAG=<previous sha>` → `docker compose -f compose.server.yml up -d`. (Schema migrations must be backward compatible: expand → migrate → contract.)

## 6. Backups (before prod)
Daily `pg_dump` from the db container to offsite storage + monthly restore drill — to be scripted in a later task.
