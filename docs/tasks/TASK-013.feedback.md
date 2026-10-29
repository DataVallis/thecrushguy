# TASK-013 feedback — `/go/{slug}` redirect + click tracking
Status: DONE (Built) — Live on dev after merge deploy

## What I implemented
Route handler `/go/[slug]`, resolver + click logger in `src/lib/go/redirect.ts`, `clicks` table (migration 0003, additive). Details: `docs/technical/go-redirect.md`.

## Decisions (my reading of the spec, ADR-024)
- Unpublished/unknown apps → 404 (not the app page: there is no public page for them).
- Sub-ID: a `{subid}` placeholder in the stored affiliate URL is replaced by `placement-locale`; networks without sub-IDs simply have no placeholder. No per-network parameter table.
- Only affiliate redirects are logged (fallbacks to our own page are not outbound clicks).
- Daily IP salt derived from `LINK_ENCRYPTION_KEY` (stable across restarts, rotates daily).

## Files changed
`src/app/go/[slug]/route.ts`, `src/lib/go/redirect.ts`, `src/lib/go/redirect.test.ts`, `src/lib/db/schema.ts`, `src/lib/db/schema.test.ts` (table count), `drizzle/0003_clicks.sql` + meta, docs (`technical/go-redirect.md`, `technical/README.md`, `03-DECISIONS.md`, `tasks/README.md`, `HANDOFF.md`).

## New dependencies
None.

## Test results (2026-10-29 17:08 CET)
```
 Test Files  12 passed (12)
      Tests  138 passed (138)
build ✓ (/go/[slug] ƒ)
```
HTTP (standalone, `APP_ENV=dev`, real Postgres, real encrypted link):
```
published + active link → 302 location: https://partner.example.com/?aff=…  x-robots-tag: noindex, nofollow · cache-control: no-store
click row: hero|en|mobile|/en|64-char hash|link set   (Referer had ?x=1 → stored path only)
Googlebot → 302, not logged · draft app → 404 · unknown slug → 404
inactive link, l=de → 302 http://localhost:3100/en/app/test-companion
35 clicks from one IP → 30 logged
latency 300 req: p50 4.4 ms, p95 7.3 ms, p99 12.6 ms
server log: 0 errors
```

## Deliberate breaks (restored → 138/138)
1. `status = 'published'` filter removed → `× draft, paused and removed apps … → not-found`.
2. Bot filter reduced to "no UA" → `× detects bots and empty user agents…`.
3. Click rate-limit condition removed → `× logs 30 clicks per IP hash per hour…`.

## NOT RUN
- Real affiliate partner redirect on dev (needs `LINK_ENCRYPTION_KEY` + a real link from the owner).

## Suggested commit message
`feat: /go redirect with async, privacy-safe click tracking (TASK-013)`
