# Handoff — state as of 2026-10-29 15:45 (Europe/Ljubljana)

## Working mode
- **Mode A — supervised** (DEVELOPMENT-RULES §1): owner creates branches, commits, merges, deploys.
- Standing permission (2026-10-29, owner's words): "Ko narediš dev branch in pushaš kodo, bom nastavil na gitu default dev branch" → agent may create `dev` and push the initial scaffold commit. Nothing beyond that. Mode B not granted.
- Ask the owner only for: secrets, accounts, servers, product decisions, prod, irreversible steps.

## Git and CI specifics
- Repo: https://github.com/DataVallis/thecrushguy · default branch `dev` (owner sets it in GitHub settings) · `main` = prod.
- Flow: `feat/TASK-XXX-name → dev → main`. **No uat** (ADR-016).
- CI: `.github/workflows/ci.yml` — lint, typecheck, format, tests (real Postgres service), build; on push to `dev`/`main` builds + pushes `ghcr.io/datavallis/thecrushguy:{dev|prod|<sha>}`.
- Commits: Conventional Commits + `Co-Authored-By` trailer + `Prompt:` line.

## When to suggest a new session
After TASK-010 is Live on dev (push, CI green, deploy verified).

## Bootstrap a fresh session
```
git clone https://github.com/DataVallis/thecrushguy && cd thecrushguy && git checkout dev
npm ci
docker compose up -d db                       # or any local Postgres 16
export DATABASE_URL=postgres://tcg:tcg_local_only@localhost:5432/thecrushguy
npm run lint && npm run typecheck && npm run format:check && npm test && npm run build
```
Known quirk: the Next.js 16.4 docs bundled in `node_modules/next/dist/docs/` are the source of truth (proxy instead of middleware, Cache Components, async params).

## Repo / environments
| Env | URL | Deploys from | Status |
|---|---|---|---|
| local | http://localhost:3000 | working tree | Built |
| dev | https://dev.thecrushguy.com | image `:dev` | Planned (owner deploys per `docs/runbooks/deploy-dev.md`) |
| prod | https://thecrushguy.com | image `:prod` | Planned |

## Done
- 2026-10-29: brand The Crush Guy + domain (ADR-008), logo A (ADR-009), affiliate research (TASK-004), entity Data Vallis (ADR-007), NSFW behind age gate from day one (ADR-006).
- 2026-10-29: TASK-010 scaffold **Built** — proof in `docs/tasks/TASK-010.feedback.md`. ADR-010…017 recorded; owner accepted ADR-011…015 and dropped uat (ADR-016); admin login = magic link from hi@thecrushguy.com (ADR-017).

## Owner's open actions
1. GitHub → repo Settings → General → **Default branch = `dev`**.
2. GitHub → Settings → Actions → General → Workflow permissions: allow read/write so CI can push to GHCR (or keep default and grant `packages: write`, already requested in the workflow). After the first CI run, GHCR package → set visibility (private recommended) and grant the server a `read:packages` token.
3. Create mailbox hi@thecrushguy.com and tell the agent where it is hosted (SMTP host) — needed for TASK-011 (ADR-017).
4. Deploy dev per `docs/runbooks/deploy-dev.md`, then check: `https://dev.thecrushguy.com/api/health` shows `"status":"ok"` and `"version"` = the pushed commit SHA.
5. Claim social handles @thecrushguy. Lawyer check `07-LEGAL-COMPLIANCE` §3 (launch-blocking, ADR-006).

## Parked ideas
- Persona poses for the heart mascot (thumbs up, yawn, raised brow).
- Cloudflare Access as a second layer in front of `/admin`.

## Next
- TASK-011 data model + admin magic link (spec: `docs/tasks/TASK-011-data-admin.md`; plan first, mode A waits for OK).
- In parallel: TASK-003 CGP, TASK-005 keywords, TASK-006 app universe, review testing template.
- Latest numbers: TASK-015 (next free TASK-016) · ADR-017 (next free ADR-018).

## Open items
- Docker image build not yet run anywhere (first CI run will prove it).
- `cloudflare/cloudflared:latest` to be pinned in `deploy/compose.server.yml` before dev deploy.
