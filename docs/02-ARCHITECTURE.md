# 02 — ARCHITECTURE

Status: **Built** (scaffold, TASK-010 — not yet Live) for stack/infra rows; everything else **Planned**. Changing the stack needs an ADR. Current decisions: ADR-010…017.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + SSR/SSG | **Next.js (App Router) + TypeScript** | SEO, ISR, owner's main stack |
| Styling | Tailwind CSS + design tokens from CGP (`tokens.json` → CSS vars) | Fast, consistent with CGP |
| DB | **PostgreSQL** | Relational listings data |
| ORM | **Drizzle** + postgres.js, drizzle-kit migrations (ADR-011) | Typed queries, SQL migrations, no engine binary |
| Cache | Redis (optional, Phase 2) | Click counters, rate limits |
| Admin | Inside same Next.js app under `/admin`, email magic-link login (ADR-017) | One codebase |
| i18n | `[locale]` root segment + JSON dictionaries, `proxy.ts` negotiation, `publishedLocales` gate (ADR-012) | Multilingual SEO without a library |
| Hosting | **Hetzner VM 91.99.191.8** shared with postaja: **Kamal 2**, host nginx + certbot → kamal-proxy, Postgres accessory (ADR-019) | Same proven setup as the owner's other apps |
| CDN / DNS / WAF | Cloudflare | Caching, bot protection, Access for admin |
| Analytics | Privacy-friendly (Plausible/Umami self-hosted) + Google Search Console | No heavy trackers |
| Error tracking | Sentry (or GlitchTip self-hosted) | |
| CI/CD | GitHub Actions CI on PRs; Kamal deploy workflows: dev on push to `dev`, prod on merge to `main` (ADR-016/019/021) | Owner's standard flow, no uat |
| LLM (content tooling) | Used only in admin/scripts for drafting + translation; output always stored as `machine` until reviewed | Speed with control |

Note: some managed hosts (e.g. Vercel) have acceptable-use rules around adult content. Even if the public site is SFW, keep hosting on own infra to avoid takedown risk.

## Environments

local → dev → prod (owner promotes by merging to `main`, which auto-deploys prod — ADR-021; no uat, ADR-016). Separate DBs. `APP_ENV` read at runtime; only `prod` is indexable. Prod affiliate links only in prod secrets; dev uses dummy targets.

## Programmatic SEO

- All money pages generated from DB data + templates (see `06-SEO-CONTENT`).
- Caching: Cache Components — `use cache` + `cacheTag`, revalidated on admin save via `revalidateTag`/`updateTag` (ADR-013).
- Comparison pages only for whitelisted pairs (keyword data) → avoids thin-content spam.
- Sitemaps: split per locale and per type (`sitemap-{locale}-{type}.xml`), max 10k URLs each.
- Structured data: `ItemList` on category pages, `Review`/`SoftwareApplication` + `AggregateRating` (own rating only, never fake user ratings), `FAQPage`, `BreadcrumbList`.
- `hreflang` + `x-default`, canonical per locale.
- Untranslated content: do not publish the locale page (no EN text on DE URL).

## Outbound click tracking (`/go/{slug}`)

1. Route handler looks up active AffiliateLink for app (+ optional locale/geo override).
2. Writes Click row (async/queued; never blocks redirect > 50 ms).
3. Appends sub-ID for reporting: `subid={placement}-{locale}` if network supports it.
4. 302 redirect. Headers: `X-Robots-Tag: noindex`, `Cache-Control: no-store`.
5. Bot filtering: skip logging known bots; rate limit per IP hash.
- Affiliate URLs with IDs live in DB encrypted or as secret references; never in repo.

## Age gate

- Middleware checks cookie `age_ok=1`. Required for: any page/section with `is_nsfw` content, NSFW category pages, NSFW screenshots/toggles.
- SFW pages do not show the gate (better UX + SEO).
- Gate must be crawler-safe: serve SFW summary to bots, NSFW details only after gate (do not cloak — same SFW content shown to users before the gate). Verify approach against current Google guidance in ADR.
- Requirements may tighten by country (UK, some US states, EU) → design gate as a pluggable provider (simple self-declaration now, third-party age verification later). See `07-LEGAL-COMPLIANCE`.

## Security

- Admin never public; 2FA; audit log for edits.
- Secrets via env/secret manager; agents only reference variable names.
- Rate limits on `/go/*` and any form.
- No raw IP storage (hash + rotating salt), no PII in logs.
- Backups: daily DB dump, offsite, monthly restore drill.

## Directory layout (proposal, confirm at scaffold)

```
/app/(public)/[locale]/...    public pages
/app/admin/...                admin
/app/go/[slug]/route.ts       redirect
/lib/db, /lib/seo, /lib/i18n, /lib/scoring
/content/templates            page copy templates
/scripts                      import, translate, verify, sitemap
/design/tokens.json           from CGP
/docs                         this documentation
```
