# TASK-015 feedback — age gate (pluggable)
Status: DONE (Built) — infrastructure Live on dev after merge; NSFW sections arrive with TASK-012

## What I implemented
Policy + provider interface (`src/lib/age-gate/policy.ts`), request-time `NsfwSection` (`gate.tsx`), pure `GatedContent` view, `POST /api/age-gate` confirm route. Details: `docs/technical/age-gate.md`.

## Decisions (ADR-025)
- Section-level gating (`<NsfwSection>`), not a route-prefix proxy rule: NSFW details live inside otherwise SFW pages (ADR-003/006).
- Fail closed: unknown location = blocked. Conservative default restricted list (GB, US, FR, DE, IT, AU) until the lawyer answers 07-LEGAL §3; configurable via `AGE_GATE_RESTRICTED_REGIONS`.
- Cookie `age_ok` (spec name), 30 days, httpOnly.

## Files changed
`src/lib/age-gate/{policy.ts,gate.tsx,view.tsx,age-gate.test.tsx}`, `src/app/api/age-gate/route.ts`, `vitest.config.mts` (include `*.test.tsx`), `.env.example`, docs (`technical/age-gate.md`, `technical/README.md`, `03-DECISIONS.md`, `tasks/README.md`, `HANDOFF.md`).

## New dependencies
None.

## Test results (2026-10-29 17:10 CET)
```
 Test Files  13 passed (13)
      Tests  152 passed (152)
build ✓ (/api/age-gate ƒ)
```
HTTP (standalone build):
```
POST confirm=yes next=/en (same origin) → 303 location /en, set-cookie age_ok=1; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax
POST from https://evil.test             → 403
GET /api/age-gate                       → 405
```

## Deliberate breaks (restored → 152/152)
1. Unknown location allowed → `× unknown location fails closed (blocked)`.
2. `next` not sanitised → `× without confirm=yes no cookie is set; open redirects are neutralised`.

## NOT RUN
- Real gated page (none exists yet) and Cloudflare location headers (domain not proxied yet).

## Suggested commit message
`feat: pluggable age gate with fail-closed geo policy (TASK-015)`
