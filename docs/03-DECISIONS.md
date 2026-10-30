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

## ADR-018 — Admin mail goes through the owner's mail server (resolves ADR-017 "Open")
- Date: 2026-10-29 · Status: Accepted (owner)
- Decision: hi@thecrushguy.com is hosted on the owner's mail server `mail.datavallis.com`; the app sends magic links via SMTP there (`SMTP_HOST=mail.datavallis.com`, port/TLS and credentials set by owner in server env files).
- Consequences: owner adds SPF (include the mail server), DKIM and DMARC records for `thecrushguy.com` in Cloudflare DNS, otherwise links land in spam. Mail headers will show the Data Vallis server (acceptable under ADR-007).

## ADR-019 — Deploy with Kamal 2 on the shared Hetzner host (supersedes ADR-015 deploy shape)
- Date: 2026-10-29 · Status: Accepted (owner: "na isti strežnik ko postaja, apipilot … poglej po projektih")
- Context: The host `91.99.191.8` already runs DataVallis/postaja with Kamal 2: host nginx + certbot terminate TLS and proxy to kamal-proxy on 127.0.0.1:8080; Postgres as a Kamal accessory; GitHub Actions deploys dev on push and prod manually; smoke check compares the deployed SHA.
- Decision: The Crush Guy uses the same pattern: `config/deploy.yml` (+ `.dev.yml`, `.prod.yml`), `.kamal/secrets*` (env references only), `ops/nginx/*.conf`, workflows `deploy-dev.yml` / `deploy-prod.yml`. Kamal builds and pushes `ghcr.io/datavallis/thecrushguy`; the CI `image` job and `deploy/compose.server.yml` + Cloudflare Tunnel are dropped. `/api/health` returns `sha` (was `version`) for the smoke check.
- Consequences: TLS via certbot on the host (Cloudflare DNS grey cloud first, then optionally orange + Full strict). Container/volume names carry the destination so dev and prod coexist on one host. Migrations at container start (`RUN_MIGRATIONS=1`) from TASK-011a.

## ADR-020 — TASK-011 scope details agreed with the owner
- Date: 2026-10-29 · Status: Accepted (owner)
- Admin allowlist: `ADMIN_EMAILS` = the owner's address, kept as a GitHub variable (not committed), like postaja's `SUPERADMIN_EMAILS`.
- Translations: the `translations` table is created in 011a; the translation editor is deferred to the languages phase (smaller PRs).
- TASK-011 is split into 011a (data model + migrations), 011b (magic-link auth), 011c (apps/categories admin + publish guard + audit), 011d (pricing, sources, affiliate links, CSV import).

## ADR-021 — Prod deploys automatically on merge to `main` (supersedes "prod deploys are manual" in DEVELOPMENT-RULES §9, ADR-016, ADR-019)
- Date: 2026-10-29 · Status: Accepted (owner: "ko se merga v main, se deploy avtomatsko požene")
- Decision: `deploy-prod.yml` runs on push to `main` once the repo variable `DEPLOY_PROD_ENABLED=true`; manual run with setup = true is used once for the first prod deploy. Deploy guard unchanged: prod only from `main`. Only the owner merges into `main`, so the merge is the release decision.
- Consequences: every merge to `main` is a release — migrations must be backward compatible (expand → migrate → contract); the smoke check fails the workflow if the deployed SHA, DB or indexability are wrong; rollback per runbook §6.

## ADR-022 — Magic-link implementation details (TASK-011b; refines ADR-017/020)
- Date: 2026-10-29 · Status: Accepted (agent, mode B — owner may override)
- Decision:
  - **Confirm step:** the emailed link opens `/admin/auth/verify?token=…`, which only renders a "Sign in to admin" button; the token is consumed by the POST (server action). Mail link scanners (e.g. Outlook Safe Links) GET links and would otherwise burn the single-use token.
  - **Rate limits:** 3 link requests per email per 15 min and 10 per client IP per hour, counted for every request (allowlisted or not) so the limit can't reveal the allowlist. Stored in `auth_rate_events` as `email:<sha256>` / `ip:<hmac>` buckets — no raw email or IP. The IP HMAC salt is random, in memory, rotated every 24 h (and on restart); client IP = nginx `X-Real-IP`.
  - **Revocation:** sessions and pending links are checked against `ADMIN_EMAILS` on every use — removing an address revokes it immediately. A successful login burns every other pending link of that address.
  - **Cookie:** `tcg_admin`, `Path=/admin`, httpOnly, SameSite=Lax, Secure whenever `SITE_URL` is https. The link base is `SITE_URL`, never the request Host header.
  - **Admin UI is English-only** with inline strings (it is unlocalized per ADR-012); public UI keeps the i18n rule.
  - **Mail capture in tests:** an in-process SMTP catcher (`test/smtp-catcher.ts`) instead of the Mailpit container from ADR-020 — no service or download needed, the real nodemailer transport is still exercised. Local dev without `SMTP_HOST` prints the link to the server console (`APP_ENV=local` only).
  - **Deploy wiring:** `SMTP_HOST`/`SMTP_USER`/`MAIL_FROM` clear in `config/deploy.yml`; `SMTP_PORT` from the optional GitHub variable (default 587, STARTTLS required; 465 = implicit TLS); `SMTP_PASSWORD` (env secret) and `ADMIN_EMAILS` (variable) are passed to the container as Kamal secrets so the address never appears in logs.
- Consequences: 2FA from 02-ARCHITECTURE "Security" is covered by possession of the mailbox; Cloudflare Access stays a parked optional second layer.

## ADR-023 — Typography: Fraunces (display + wordmark) + Onest (text); supersedes the type part of ADR-009 and 05-BRAND working type
- Date: 2026-10-29 · Status: Accepted (owner picked option B from `font-options` preview; "da, kot v predogledu" for the text font)
- Context: Bricolage Grotesque (and Inter) are the owner's PetPrep fonts — the brand must not look like PetPrep.
- Decision: display font **Fraunces** (soft serif, variable wght + opsz), text font **Onest** (variable wght). Both OFL, self-hosted woff2 in `src/fonts/` (latin + latin-ext subsets, ADR-014). The wordmark "thecrushguy" is re-outlined from Fraunces ExtraBold 800 ("crush" stays coral); all logo files are regenerated by `design/logo/generate.py`. Mascot unchanged.
- Consequences: Fraunces has no Cyrillic/Greek — if such a locale is ever added, headings fall back to the serif stack (decide in TASK-003). TASK-003 (CGP) builds on this pair.

## ADR-024 — `/go/{slug}` behaviour details (TASK-013)
- Date: 2026-10-29 · Status: Accepted (agent, mode B — owner may override)
- Decision: unpublished/unknown apps → 404; published app without a usable active link → 302 to our app page (never 404). Sub-IDs via a `{subid}` placeholder in the stored affiliate URL (filled with `placement-locale`). Only affiliate redirects by non-bots are logged, after the response (`after()`), max 30 per IP hash per hour. IP hash = HMAC with a daily salt derived from `LINK_ENCRYPTION_KEY`. Referrer policy stays the site-wide `strict-origin-when-cross-origin`.
- Consequences: changing the link-encryption key also changes the IP salt (only affects same-day rate limiting). Click stats in admin come with the stats task.

## ADR-025 — Age gate shape (TASK-015; implements ADR-006 default "geo rule (a)")
- Date: 2026-10-29 · Status: Accepted (agent, mode B) — the restricted region list is **Proposed**, owner/lawyer to confirm (07-LEGAL §3)
- Decision: NSFW content is gated per section (`<NsfwSection>`), self-declaration cookie `age_ok=1` (30 days) behind an `AgeVerificationProvider` interface. Location from Cloudflare headers; unknown location fails closed. Restricted regions default to GB, US, FR, DE, IT, AU (blocked even with the cookie), overridable by env `AGE_GATE_RESTRICTED_REGIONS`. Same SFW markup for every visitor without the cookie (no cloaking); pages with gated sections are `noindex`.
- Consequences: NSFW sections stay hidden for everyone until the domain is proxied through Cloudflare with location headers, and the origin must then accept only Cloudflare traffic (else the header is spoofable). The lawyer's answer narrows the list.

## ADR-026 — Editorial fields, publish quality gate, gated sections on indexable pages (TASK-012a; corrects ADR-025)
- Date: 2026-10-29 · Status: Accepted (agent, mode B — owner may override)
- Decision:
  - New app fields: a one-line reason per sub-score, pros and cons (max 5 each, DB check), "best for" tags, verdict.
  - **Quality gate** (06-SEO-CONTENT "No thin pages"): an app can only be published — and a published app only edited or lose a price — when it has all six scores with reasons, a verdict, 3–5 pros, 3–5 cons and at least one sourced price. Enforced in the admin write path; the compliance checklist stays a DB constraint.
  - **Correction to ADR-025**: only pages that are gated *as a whole* (adults-only category pages) are `noindex`. A page with a small gated section (the "adult content allowed" fact on an app page) stays indexable, because every visitor without the cookie — crawlers included — gets identical SFW markup (no cloaking).
  - Info pages are English-only content modules; privacy/terms are marked "Draft" and `noindex` until a lawyer reviewed them; the imprint stays `noindex` until the operator's address, registration and VAT numbers are provided.
- Consequences: imported apps need editorial work before publishing; admin weights remain fixed in code for now.

## ADR-027 — No lawyer review; imprint published (owner, 2026-10-29)
- Date: 2026-10-29 · Status: Accepted (owner: "to ignoriraj — odvetniški pregled … in odgovor, v katerih regijah skriti vsebino za odrasle")
- Decision: privacy policy and terms go live as written (`LEGAL_TEXTS_REVIEWED = true` → indexable, no "Draft" note). The 07-LEGAL §3 lawyer check is dropped; the age gate keeps the conservative default restricted list (GB, US, FR, DE, IT, AU) and fail-closed on unknown location (ADR-025) — no change in behaviour. Imprint shows DATA VALLIS d.o.o., Ulica Šercerjeve brigade 5, 2000 Maribor, reg. no. 8552967000, VAT SI89424999 (EU e-Commerce Directive Art. 5 information duty for an EU-established provider).
- Consequences: supersedes the launch-blocking lawyer item of ADR-006/ADR-025. Owner accepts the legal risk of unreviewed texts; the agent keeps the content-policy hard rules (07-LEGAL §2) unchanged.

## ADR-028 — Real 404s via proxy + global-not-found; SEO shapes (TASK-014)
- Date: 2026-10-29 · Status: Accepted (agent, mode B)
- Decision: the proxy checks app/category slugs against an in-memory list of published slugs (60 s TTL, dropped on admin save; skipped if the DB is down) and rewrites unknown URLs to a path that matches no route; `app/global-not-found.tsx` (experimental `globalNotFound`) answers with HTTP 404 and a branded page. Sitemaps: index + per locale/type files, prod only in the index. JSON-LD: our own `Review` on `SoftwareApplication`, never `AggregateRating`; hreflang only for published locales + x-default.
- Consequences: depends on an experimental Next.js flag — re-check on Next upgrades. The 404 page is English (locale unknown at that level).

## ADR-029 — Palette A "Midnight coral" (TASK-003)
- Date: 2026-10-29 · Status: Accepted (owner picked option A from `palette-options.png`)
- Decision: ink #1B1530, coral #FF4D6D (logo), coral-strong/CTA #C81E45 (hover #A8163A), blush #FFE4EA, paper #FFF8F9, lavender #F3F0FA, state colours. Primary CTA uses `cta` with white text because white on bright coral is only 3.2:1 (fails WCAG AA). `design/tokens.json` is the source of truth; `globals.css` mirrors it; a test enforces sync and AA contrast for every listed text pair. Guidelines: `design/CGP.md`.

## ADR-030 — Data-based ratings without hands-on testing; owner does the gallery check (TASK-016)
- Date: 2026-10-29 · Status: Accepted (owner: "dajmo avtomatizirat, nebom jaz testiral vseh aplikacij"; picked "Podatkovne ocene" and "Jaz, 2 min/app")
- Decision:
  - Apps may be published with a **data-based rating** (`apps.review_method = 'data'`): sub-scores, one-line reasons, pros, cons and verdict are computed by code (`src/lib/review/data-review.ts`) from sourced public facts (`apps.facts`, `docs/research/FACTS-BRIEF.md` format). A fact counts only with a source URL; "not stated" earns nothing. The formula is published on /how-we-rank.
  - **Conversation** (chat quality) is never scored from data — it stays empty ("Not tested"); the overall score is the weighted average of the sub-scores present.
  - Pages say "Rated from public information … not tested hands-on yet", list every source with its date, and emit **no Review/Rating JSON-LD** (Google review-snippet rules require first-hand reviews). Hands-on reviews keep the `Review` markup and are never overwritten by an import.
  - The **gallery check for minor-coded content stays human** (07-LEGAL §2 hard rule; agents may not open explicit galleries). The owner does it in `/admin/research` ("Gallery OK — publish" / "Reject"), one audited step that ticks `chk_no_minor_content` and publishes. The other four checklist items are set from sourced facts.
  - Research data ships with the app (`src/data/research-bundle.json`, built by `scripts/build-research-bundle.py`) and is imported with one click; conflicts found in research (e.g. "Teen Mode", 12+ store rating, no 18+ terms) are put on hold in the bundle.
- Supersedes: 06-SEO-CONTENT "Real testing" as a *publishing* requirement (it stays the goal for top earners); ADR-026 quality gate allows an empty conversation score for data reviews.
- Consequences: weaker E-E-A-T than hands-on reviews — honest labels and sources are the mitigation; scores reflect what an app offers on paper, not quality. Prices must have a known billing period. Research quotes were extracted by a summariser — spot-check before relying on a single fact.

## ADR-031 — GEO: welcome AI search engines, llms.txt, quick answers, IndexNow (TASK-017)
- Date: 2026-10-29 · Status: Accepted (agent, mode B — owner asked "a seo in geo, za ai iskalnike optimizacijo imamo narejeno?")
- Decision:
  - robots.txt (prod) names the AI search/answer crawlers (OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User, DuckAssistBot) and allows them; training crawlers (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot) are allowed by default for brand visibility in model answers, and can be shut out with the GitHub variable `AI_TRAINING_BOTS=block`. Every group repeats the `/go/`, `/api/`, `/admin` disallows.
  - `/llms.txt` (llmstxt.org): site summary, method links, categories and every published app with score, review method, free plan and starting price.
  - App pages get "Quick answers" (is it free / how much / is it private / features / who runs it), built only from sourced fields, with matching `FAQPage` JSON-LD (same text as visible).
  - IndexNow ping (Bing → ChatGPT search, Copilot, DuckDuckGo) after admin saves/publishes, prod only; key served at `/indexnow-key.txt`, from env `INDEXNOW_KEY` or derived one-way from `LINK_ENCRYPTION_KEY`.
- Consequences: no owner setup needed except Bing Webmaster Tools verification (runbook). Google no longer shows FAQ rich results for most sites — the markup is kept for AI parsers and costs nothing.

## ADR-032 — Home/app UX v2; "Visit" always works; honest hero (TASK-018; amends ADR-024)
- Date: 2026-10-29 · Status: Accepted (owner: "povnega grdo zgleda stran … nevem kako pridem do nomi stran … nazaj na seznam tudi neznam prit")
- Decision:
  - Home: full-bleed midnight hero with the promise and our top pick as a "profile" card; the whole ranked shortlist with "What matters to you?" filters (free plan, voice, pictures, memory, under $10 — filters only hide, ranking order never changes); top-5 comparison table; data-computed quick answers (+FAQPage JSON-LD).
  - List cards: fact chips + one **green flag / red flag** (pros/cons in dating vocabulary, picked to avoid repeating the chips); the whole card opens the review.
  - App page: "Back to all apps" link, "Visit {App}" always shown (header, verdict, sticky bar on mobile), green/red flags right after quick answers, sources collapsed.
  - **ADR-024 amended**: `/go/{slug}` without an active affiliate link redirects to the app's official website (logged as a click with `link_id` null — shows where an affiliate deal is worth chasing); our app page only if the stored website is invalid.
  - Hero copy no longer claims hands-on testing of every app ("Find an AI crush worth your time."), matching ADR-030.
- Consequences: clicks table now also counts non-affiliate visits; stats must split by `link_id`.

## ADR-033 — MCP endpoint for the research agent (TASK-021)
- Date: 2026-10-29 · Status: Accepted (owner: "meni to ni všeč da moram tak vpisevat noter, naredima mcp, da boš ti dodajal?")
- Decision: `POST /api/mcp/<MCP_TOKEN>` — a stateless MCP server (Streamable HTTP, JSON responses, no SDK). Tools: review_queue, list_apps, get_app, add_app, add_source, set_price, set_fact, set_facts, set_checklist, set_status, import_research_bundle. Every write goes through the same rules as /admin (sources required, quotes for privacy/terms facts, audit rows with actor `mcp-agent@thecrushguy.com`, quality gate, cache invalidation).
- Never via MCP: publishing, the gallery check (`chk_no_minor_content`), affiliate links. Unticking a checklist item of a published app requires unpublishing first.
- Auth: secret token in the path (claude.ai custom connectors take a URL), compared in constant time; unset or < 32 chars → 404. Separate token per environment (GitHub environment secret `MCP_TOKEN`). The path token can appear in access logs — rotate by changing the secret.

## ADR-034 — Google Analytics 4 with consent (TASK-022)
- Date: 2026-10-29 · Status: Accepted (owner provided measurement ID G-C7DSZV0X87 for prod)
- Decision: GA4 loads only on prod (`APP_ENV=prod` + `GA_MEASUREMENT_ID` in `config/deploy.prod.yml`, a public ID) and only after the visitor clicks "Allow analytics" (EU ePrivacy/GDPR). Choice in cookie `tcg_consent` (1 year); "Cookie settings" in the footer reopens it. Outbound `/go` clicks become `visit_app` events. Privacy policy updated (Google Ireland, `_ga` cookies, DPF transfer, consent basis).
- Consequences: GA numbers undercount (only consenting visitors); our own `/go` click log stays the source of truth for clicks.

## ADR-035 — Agent merges releases to `main` (supersedes "only the owner merges into `main`" in ADR-028/deploy)
- Date: 2026-10-30 · Status: Accepted (owner: "Dej ti megaj vse zakaj mene caka")
- Decision: in Mode B the agent also merges release PRs `dev → main` (merge commit, not squash), but only when CI is green on `dev` and the dev deploy + smoke `verify` passed. Prod deploy runs automatically on the merge; the agent waits for `Deploy prod` to finish and reports the result.
- Still owner-only: the gallery check/publishing of apps, affiliate links, secrets, anything under the content-policy STOP rule, and irreversible prod data changes.
- Consequences: releases no longer wait for the owner; a broken prod deploy is the agent's to roll back (revert PR to `dev`, release again).

## ADR-036 — Geo-limited affiliate links; agent may set link countries
- Date: 2026-10-30 · Status: Accepted (owner: "js bi raje da tebi tu not mečem linke in slike držav pa ti to urejaš")
- Decision: `affiliate_links.countries` (null = all). `/go` sends visitors outside the list (or with unknown country) to the official site, because networks redirect non-target traffic to unrelated fallback offers. MCP tool `set_link_countries` lets the agent set the list from the offer's country screenshot.
- Still owner-only: the affiliate URL itself is entered in /admin (encrypted on save). The agent never receives, stores or reads tracking URLs (CLAUDE.md hard rule; ADR-033 unchanged).
