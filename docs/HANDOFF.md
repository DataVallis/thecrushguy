# Handoff — state as of 2026-10-29 16:00 (Europe/Ljubljana)

## Working mode
- **Mode B — autonomous** (DEVELOPMENT-RULES §1) since 2026-10-29 15:54. Owner's words: "to odpreš PR in mergaš v dev sam" (you open the PR and merge into dev yourself).
- Standing permissions: agent commits on `feat/*`, `fix/*`, `docs/*`; opens PRs to `dev`; merges to `dev` **only when every CI check is green**; verifies the dev deploy. Never touches `main`/prod, servers or secrets — merging to `main` (= prod release, ADR-021) is the owner's.
- Earlier (2026-10-29): initial scaffold push to `dev` ("Ko narediš dev branch in pushaš kodo…").
- Approved dependencies (2026-10-29, owner "ja"): `nodemailer`, `zod` (TASK-011).
- Ask the owner only for: secrets, accounts, servers, product decisions, prod, irreversible steps.

## Git and CI specifics
- Repo: https://github.com/DataVallis/thecrushguy · default branch `dev` (owner sets it in GitHub settings) · `main` = prod.
- Flow: `feat/TASK-XXX-name → dev → main`. **No uat** (ADR-016).
- CI: `.github/workflows/ci.yml` — lint, typecheck, format, tests (real Postgres service), build.
- Deploy (ADR-019, same as postaja): Kamal 2. `deploy-dev.yml` on push to `dev` (once `DEPLOY_DEV_ENABLED=true`), `deploy-prod.yml` on merge to `main` once `DEPLOY_PROD_ENABLED=true` (ADR-021). Kamal builds/pushes `ghcr.io/datavallis/thecrushguy`.
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
| dev | https://dev.thecrushguy.com | `dev` branch via Kamal, host 91.99.191.8 | Planned (first deploy per `docs/runbooks/deploy-dev.md`) |
| prod | https://thecrushguy.com | `main`, auto-deploy on merge (ADR-021), same host | Planned |

## Done
- 2026-10-29: brand The Crush Guy + domain (ADR-008), logo A (ADR-009), affiliate research (TASK-004), entity Data Vallis (ADR-007), NSFW behind age gate from day one (ADR-006).
- 2026-10-29: TASK-010 scaffold **Built**, pushed to `dev` (commit `chore: scaffold…`) — proof in `docs/tasks/TASK-010.feedback.md`. ADR-010…017; owner accepted ADR-011…015 and dropped uat (ADR-016); admin login = magic link (ADR-017) via mail.datavallis.com (ADR-018).
- 2026-10-29: TASK-010b Kamal deploy (ADR-019/021) — PR from `feat/TASK-010b-kamal-deploy` to `dev` — `docs/tasks/TASK-010b.feedback.md`. TASK-011 split agreed (ADR-020).

## Owner's open actions
1. GitHub DataVallis → **Billing**: Actions can't start ("recent account payments have failed or spending limit") — first CI run 40893619782 never started.
2. Default branch = `dev` (check).
3. Follow `docs/runbooks/deploy-dev.md`: Cloudflare DNS (grey cloud), nginx + certbot on the host, GitHub variables/secrets, first "Deploy dev" with setup = true; then `DEPLOY_DEV_ENABLED=true`.
4. DNS for hi@thecrushguy.com on mail.datavallis.com: MX, SPF, DKIM, DMARC (ADR-018).
5. Set repo variable `ADMIN_EMAILS` (owner's address, ADR-020).
6. Claim social handles @thecrushguy. Lawyer check `07-LEGAL-COMPLIANCE` §3 (launch-blocking, ADR-006).

## Parked ideas
- Persona poses for the heart mascot (thumbs up, yawn, raised brow).
- Cloudflare Access as a second layer in front of `/admin`.

## Next
- TASK-011a data model + migrations (spec: `docs/tasks/TASK-011-data-admin.md`, plan agreed 2026-10-29 except dependency approval).
- In parallel: TASK-003 CGP, TASK-005 keywords, TASK-006 app universe, review testing template.
- Latest numbers: TASK-015 (+010b, 011a–d sub-tasks; next free TASK-016) · ADR-021 (next free ADR-022).

## Open items
- Docker image build not yet run anywhere (first Kamal deploy will prove it).
- GitHub Actions blocked by org billing.
