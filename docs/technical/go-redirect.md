# `/go/{slug}` — outbound redirect + click tracking

Status: **Live on dev** (TASK-013, PR #8). Code: `src/app/go/[slug]/route.ts`, `src/lib/go/redirect.ts`. Table: `clicks` (migration `0003_clicks`).

## Request
`GET /go/{slug}?p={placement}&l={locale}` — `p` = where the CTA sat (`[a-z0-9_-]{1,32}`, else `unknown`), `l` = page locale (known locales only).
Public pages (TASK-012) link CTAs here with `rel="sponsored nofollow"`.

## Response
| Case | Response |
|---|---|
| Published app with an active affiliate link | `302` → decrypted affiliate URL (`{subid}` in the stored URL is replaced by `placement-locale`) |
| Published app, no active link, or link can't be decrypted (wrong/missing key) | `302` → our app page `/{locale}/app/{slug}` (published locale, else `en`); undecryptable link logs `[go] affiliate link unusable` |
| Draft / paused / removed / unknown / malformed slug | `404` |

Always `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`. Referrer policy is the site-wide `strict-origin-when-cross-origin` (partners see our origin, never the path). Affiliate targets must be https.

## Click log
Written with `after()` — after the response is sent, so it never delays the redirect; a failed insert is logged (`[go] click log failed`) and the visitor is unaffected.
Only for affiliate redirects, and only for non-bots (crawler, previewer, monitor and HTTP-library user agents, or UA missing/very short).
Columns: app, link, placement, locale, country (`CF-IPCountry` when Cloudflare proxies, else null), device (mobile/tablet/desktop from UA), referrer path (same-site path only, no query), `ip_hash`, time.
- `ip_hash` = HMAC-SHA256(daily salt, client IP from nginx `X-Real-IP`); daily salt = HMAC(`LINK_ENCRYPTION_KEY`, date) so it rotates every day, survives restarts and is useless without the server key (random per process if the key is missing). Raw IPs are never stored.
- Rate limit: max 30 logged clicks per IP hash per hour (the redirect itself is never blocked).

## Measured (local standalone build, 2026-10-29)
300 sequential requests: p50 4.4 ms · **p95 7.3 ms** · p99 12.6 ms · max 24.4 ms (target < 50 ms p95).

## Tests
`src/lib/go/redirect.test.ts` (real Postgres): affiliate target + subid, inactive link → app page (incl. unpublished locale), draft/paused/removed/unknown/malformed → 404, wrong key → app page, rate limit per IP and window, DB checks on placement/device, bot and device detection, input cleaning, IP hash day rotation.
