# Age gate (pluggable)

Status: **Live on dev** (TASK-015, PR #9) — infrastructure only; no NSFW sections exist yet (they come with public pages, TASK-012). Decisions: ADR-006, ADR-025.

## Use
```tsx
<Suspense fallback={null}>
  <NsfwSection returnTo={`/${locale}/app/${slug}`}>…NSFW-only details…</NsfwSection>
</Suspense>
```
`src/lib/age-gate/gate.tsx` reads cookies + headers at request time and renders `GatedContent` (`view.tsx`). Any page containing a gated section must set `robots: { index: false, follow: false }`. SFW pages never use it and are never gated.

## Decision (`src/lib/age-gate/policy.ts`)
| Visitor | Result |
|---|---|
| Region unknown (no `CF-IPCountry`, or `XX`/`T1`) | **blocked** — fail closed |
| Country or `country-subdivision` on the restricted list | **blocked** ("not available in your region"), even with the cookie |
| Allowed region, no `age_ok=1` cookie (humans and bots alike) | **gate** — SFW notice + "I am 18 or older" button |
| Allowed region, cookie set | **show** |

Restricted list: env `AGE_GATE_RESTRICTED_REGIONS` (comma-separated `GB`, `US-TX`, …); unset → conservative default `GB, US, FR, DE, IT, AU` (geo rule (a) from 07-LEGAL §3 until the lawyer answers). Location comes from Cloudflare (`CF-IPCountry`, `CF-Region-Code` with the "visitor location headers" managed transform), so **NSFW stays hidden everywhere until the domain is proxied through Cloudflare** — and then the origin must accept traffic only from Cloudflare, otherwise the header can be spoofed.

## Confirm
`POST /api/age-gate` (`confirm=yes`, `next=/local/path`) → `303` back to the local path with `age_ok=1; Path=/; Max-Age=30 days; HttpOnly; SameSite=Lax` (+ `Secure` on https). No `confirm=yes` → no cookie. Foreign `Origin` → 403. `next` is reduced to a local path (no open redirect).

## Provider interface
`AgeVerificationProvider { id, isVerified(cookie) }` — `selfDeclaration` today; a third-party verifier (07-LEGAL §3 option b) implements the same interface and its own confirm route.

## No cloaking
Everyone without the cookie — crawlers included — gets identical SFW markup; crawlers never see gated content.

## Tests
`src/lib/age-gate/age-gate.test.tsx`: decisions (allowed/restricted/subdivision/unknown), env parsing, header parsing, provider, rendered markup for gate/show/blocked (gated content absent), return-path sanitising, confirm route (cookie flags, no-confirm, open redirect, cross-site 403).
