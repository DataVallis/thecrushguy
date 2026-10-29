# 00 — MANIFEST

## One-liner

The most trusted independent guide to AI companion apps: ranked lists, honest reviews and side-by-side comparisons, in 15+ languages.

## Why this exists (business thesis)

- Curated directories ("ranked lists + one page per site + outbound links") are a proven model: SEO brings visitors with commercial intent, the directory sends them on, affiliate programs pay.
- Established adult directories are saturated (13-year-old domains, many clones). **AI companion apps are a young category**: high search demand, few authoritative directories, new apps launch weekly.
- AI companion affiliate programs pay **high lifetime revenue share** (30–50% reported, see `04-BUSINESS-MODEL`). A referred subscriber keeps paying for months, so revenue compounds.
- The owner can build fast (Next.js, programmatic SEO, AI translation), so cost is mainly time.

## Goals

| Horizon | Goal |
|---|---|
| Month 1 | Brand, domain, CGP done; site live with 50+ app listings in EN |
| Month 3 | 150+ listings, 10 languages, all core page types live, first affiliate commissions |
| Month 6 | 30k organic visits/month, 300+ commission-earning referrals cumulative |
| Month 12 | 150k+ visits/month, first direct ad-slot sales, revenue covers all costs + owner time |

Targets are directional; revise after first 90 days of data.

## Scope (v1)

- Public directory: categories, ranked lists, app detail pages, comparisons ("X vs Y"), alternatives ("X alternatives"), best-of lists.
- Affiliate link redirect service with click tracking (`/go/{app-slug}`).
- Admin (internal) to manage apps, categories, scores, affiliate links, translations.
- i18n: EN first, then DE, FR, ES, IT, PT, PL, NL, JA, KO, plus others by data.
- SFW public surface. NSFW details only behind age gate (see ADR-003).

## Non-goals (v1)

- User accounts, user reviews, comments (later, if ever — moderation cost).
- Hosting or generating any adult content ourselves.
- Own companion app (possible Phase 4, separate decision).
- Paid ads to the site (organic first).

## Success metrics

- Organic sessions/month (GSC + analytics)
- Outbound click-through rate (clicks on `/go/*` ÷ sessions)
- Affiliate revenue per 1,000 sessions (EPMV)
- Number of indexed pages and avg. position for priority keywords
- Listings freshness: % of apps re-verified in last 60 days

## Glossary

- **Listing / app** — one AI companion product we list.
- **Category** — grouping (e.g. "AI girlfriend", "voice companions", "free apps").
- **Ranked list** — ordered set of apps in a category with our score.
- **Revshare** — affiliate pays % of what the referred user spends, often for lifetime.
- **CPA / PPS** — one-off payout per signup / per paying user.
- **EPMV** — earnings per 1,000 visits.
- **`{{BRAND}}`** — placeholder until the brand name is chosen.
