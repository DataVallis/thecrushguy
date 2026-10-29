# 03 — DECISIONS (ADRs)

Append-only. Newest wins. Format: ID, date, status, context, decision, consequences.

---

## ADR-001 — Niche: AI companion apps (not general adult directory)
- Date: 2026-10-29 · Status: Accepted (owner)
- Context: General adult directories are saturated (old domains, many clones). AI companion apps are new, growing, and pay high lifetime revshare.
- Decision: Build a directory/review/comparison site for AI companion apps.
- Consequences: Must track a fast-changing app market; freshness is a core feature.

## ADR-002 — Separate brand (and recommended separate legal entity)
- Date: 2026-10-29 · Status: Accepted (brand) / Proposed (entity — owner decides)
- Decision: Project runs under its own brand, domain and socials, not connected publicly to Data Vallis, CHERR.IO, Inženirji.si or other client-facing brands. Legal entity choice is the owner's.
- Consequences: Separate accounts (email, analytics, affiliate networks, payouts).

## ADR-003 — SFW-first public surface, NSFW behind age gate
- Date: 2026-10-29 · Status: Proposed
- Decision: All indexable pages are SFW (no explicit images/text). Whether an app allows NSFW is a factual attribute; explicit details/screenshots only behind the age gate.
- Consequences: Better SEO safety, broader ad/payment options, easier branding. Possibly lower conversion on NSFW-intent queries — revisit after 90 days of data.

## ADR-004 — Stack: Next.js + PostgreSQL on Hetzner behind Cloudflare
- Date: 2026-10-29 · Status: Proposed
- Decision: See `02-ARCHITECTURE`. ORM choice made at TASK-010.

## ADR-005 — Rankings independent of payouts
- Date: 2026-10-29 · Status: Accepted
- Decision: Scores and order never depend on affiliate terms. Paid placements only in labeled "Sponsored" slots.
- Consequences: Trust and long-term SEO; must be visible in `/how-we-rank`.

## ADR-006 — NSFW section behind age gate from day one (supersedes ADR-003 timing)
- Date: 2026-10-29 · Status: Accepted (owner)
- Context: Owner chose not to wait 90 days; NSFW-intent queries convert better.
- Decision: Indexable/public pages stay SFW (ADR-003 rules for public surface still apply). A gated NSFW section (factual NSFW attributes, explicit-capable app details) ships at launch behind the age gate.
- Consequences: TASK-015 (age gate) moves into the MVP critical path. The `07-LEGAL-COMPLIANCE` §3 [LAWYER] check (UK OSA, US state AV laws, EU/DE/FR, SI) becomes **launch-blocking**; until it is answered, default to geo rule (a): NSFW section hidden in regions with mandatory AV laws. Gated pages: `noindex`. Content-policy hard rules (§2) apply unchanged.

## ADR-007 — Legal entity: Data Vallis d.o.o. for now
- Date: 2026-10-29 · Status: Accepted (owner), revisit before first payout or at €X revenue
- Context: Owner chose not to set up a new entity yet. ADR-002 keeps the brand separate.
- Decision: Affiliate network accounts, invoices and payouts go to Data Vallis d.o.o.
- Consequences: The legally required `/imprint` will name Data Vallis d.o.o., so the brand is publicly traceable to Data Vallis (ADR-002 "not connected publicly" is only partially achievable). Tell the bank about affiliate income from adult-adjacent networks up front. [ACCOUNTANT] foreign affiliate income + VAT treatment under Data Vallis. Keep separate bookkeeping cost centre so a later spin-off to a new d.o.o. is easy.

## ADR-008 — Brand name: The Crush Guy (thecrushguy.com)
- Date: 2026-10-29 · Status: Accepted (owner bought the .com on 2026-10-29)
- Context: Owner wanted a ThePornDude-style name: plain words + a persona that is easy to remember. TMview search "TheCrushGuy" → 0 results; "Crush guy" → 1 unrelated, ended US mark (class 25, 2014). Checked by owner 2026-10-29.
- Decision: Brand = **The Crush Guy**, domain thecrushguy.com. `{{BRAND}}` = "The Crush Guy". The brand is fronted by a persona ("the guy who tried every AI crush so you don't have to").
- Consequences: Persona voice drives copy and reviews. The persona is an illustrated/abstract character — never a real person, never a sexualized figure (07-LEGAL §2). `05-BRAND.md` logo rule "no faces" is relaxed only for an abstract, SFW mascot (e.g. a heart with sunglasses), decided in TASK-002. Social handles: owner to claim @thecrushguy (or variant).

## ADR-009 — Logo: concept A "cool heart" (heart with sunglasses)
- Date: 2026-10-29 · Status: Accepted (owner)
- Decision: The mascot/logo is a coral heart wearing sunglasses with a small smile; wordmark "thecrushguy" in Bricolage Grotesque 800 with "crush" in coral. Files in `design/logo/`.
- Consequences: The heart is the persona's "face" (ADR-008); poses/expressions may be added later as SVG variants, always SFW.

## ADR-010 — Stack confirmed all-in: Next.js 16 + PostgreSQL 16 on Hetzner (accepts ADR-004)
- Date: 2026-10-29 · Status: Accepted (owner: "all in — Hetzner, Next.js, Postgres; no coming-soon page")
- Decision: ADR-004 accepted. No interim static/coming-soon site. Next.js 16.4 (App Router, TS strict, Turbopack), Tailwind 4, Node 22.
- Consequences: TASK-010 scaffold built; TASK-011 → TASK-012 → TASK-013/015 follow before affiliate applications.

## ADR-011 — ORM: Drizzle (drizzle-orm + postgres.js), migrations with drizzle-kit
- Date: 2026-10-29 · Status: Proposed (owner to confirm)
- Why Drizzle over Prisma: SQL-first and typed, no query engine binary (small standalone image, fast cold start), plain SQL migration files reviewable in PRs.
- Consequences: schema in `src/lib/db/schema.ts`, migrations in `drizzle/`. Production migration runner (script in image) added in TASK-011 with the first tables.

## ADR-012 — i18n without a library: `[locale]` root segment + JSON dictionaries
- Date: 2026-10-29 · Status: Proposed (owner to confirm)
- Context: 02-ARCHITECTURE suggested next-intl "or similar". Next 16 has `next/root-params` + Cache Components; a library adds a dependency and caching edge cases.
- Decision: routes under `src/app/[locale]/`, dictionaries in `src/i18n/messages/*.json`, `proxy.ts` redirects unprefixed paths using Accept-Language. `publishedLocales` gates what is indexable; unpublished locales render `noindex` and are never negotiated. `/api`, `/go`, `/admin` are not localized.
- Consequences: no plural/ICU formatting yet; revisit (e.g. add `Intl.PluralRules` helpers or next-intl) when locale #2 is published.

## ADR-013 — Caching: Cache Components (`use cache` + tags) instead of ISR timers
- Date: 2026-10-29 · Status: Proposed
- Decision: Next 16 default. DB-driven pages use `use cache` with `cacheTag('app:<slug>')` etc.; admin saves call `revalidateTag`/`updateTag`. Replaces the "ISR 24h/6h" wording in 02-ARCHITECTURE.
- Consequences: freshness is event-driven (on save), not time-driven; add `cacheLife` only where data comes from outside the admin.

## ADR-014 — Self-hosted fonts, no Google Fonts requests
- Date: 2026-10-29 · Status: Accepted
- Decision: Bricolage Grotesque + Inter (OFL) woff2 files in `src/fonts/`, loaded via `@font-face` with unicode-range (latin, latin-ext). No third-party font requests (GDPR; EU case law on Google Fonts IP transfer).

## ADR-015 — Deploy shape: Docker image (GHCR) + docker compose per env + Cloudflare Tunnel
- Date: 2026-10-29 · Status: Proposed (owner to confirm; owner runs all server steps)
- Decision: CI (GitHub Actions) runs lint/typecheck/format/test (real Postgres)/build; on push to dev/uat/main builds `ghcr.io/<repo>:<branch>` and `:<sha>`. Server: `deploy/compose.server.yml` (app + postgres + cloudflared) per environment; no inbound ports open; TLS/WAF at Cloudflare. One image promoted across envs — `APP_ENV` is read at runtime (only `prod` is indexable: `X-Robots-Tag` + `robots.txt`).
- Consequences: if the owner prefers GitLab CI or Caddy instead of a tunnel, only `.github/workflows/ci.yml` / the compose file change.

## ADR-016 — Owner accepts ADR-011…015; only two environments (dev, prod) — supersedes the uat part of DEVELOPMENT-RULES §5/§9 and ADR-015
- Date: 2026-10-29 · Status: Accepted (owner)
- Owner's words: Drizzle "ok"; i18n without a library "ok, if languages work well for SEO and GEO"; Cache Components "ok"; one image for all envs "ok, only we don't need uat — only dev and prod"; GitHub Actions + GHCR "yes".
- Decision: ADR-011, ADR-012, ADR-013, ADR-015 → Accepted. Environments: local, dev, prod. Git flow: `feat/* → dev → main (prod)`; default branch `dev`. CI builds image tag `:dev` from `dev` and `:prod` from `main` (plus `:<sha>`). Prod deploys stay manual (owner).
- Consequences: ADR-012 carries an explicit quality bar — before any second locale is published: `hreflang` + `x-default`, per-locale canonicals, per-locale sitemaps, translated slugs decision, and `lang` on `<html>` (already done). Tracked in TASK-014.

## ADR-017 — Admin login: email magic link, sent from hi@thecrushguy.com
- Date: 2026-10-29 · Status: Accepted (owner chose magic link) / details Proposed
- Decision (details proposed by agent, part of TASK-011):
  - Only emails in env `ADMIN_EMAILS` (comma-separated) can request a link; for any other email the response is identical (no account enumeration) and nothing is sent.
  - Token: 32 random bytes, stored only as SHA-256 hash, single use, expires after 15 minutes; request rate-limited per email and per IP hash.
  - Session: httpOnly + Secure + SameSite=Lax cookie, server-side session row, 7-day expiry, logout deletes the row; every `/admin` route and admin action checks the session on the server.
  - Email sent via SMTP of the hi@thecrushguy.com mailbox (env `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`); new dependency `nodemailer` (needs owner approval at TASK-011 plan).
  - Optional extra layer later: Cloudflare Access in front of `/admin`.
- Open: where the mailbox is hosted (decides SMTP host; Cloudflare Email Routing alone cannot send).
