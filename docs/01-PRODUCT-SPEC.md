# 01 — PRODUCT SPEC

Status labels: **Planned** (nothing is built yet).

## 1. Audience

- **Searchers with intent**: "best AI girlfriend app", "Candy AI alternatives", "Replika vs Character AI", "free AI chat no filter".
- Mostly 18–45, mobile-first (expect 70%+ mobile), global, English + major languages.
- They want: which app to pick, is it free, what does it cost, is it safe/private, how good is memory/voice/images.

## 2. Page types (all Planned)

| Page | URL pattern | Purpose | Notes |
|---|---|---|---|
| Home | `/` | Top categories + top-ranked apps + "new this week" | Fast, scannable, no fluff |
| Category / ranked list | `/{locale}/category/{slug}` | Ranked list of apps in category with score, price, key pros | Main SEO money page |
| App detail | `/{locale}/app/{slug}` | Full review: score breakdown, pricing table, features, pros/cons, privacy, screenshots, CTA | One per app |
| Comparison | `/{locale}/compare/{a}-vs-{b}` | Side-by-side table + verdict | Generated only for pairs with search demand (from keyword data), not all N² pairs |
| Alternatives | `/{locale}/app/{slug}/alternatives` | "Best X alternatives" ranked list | High-intent SEO |
| Best-of / guide | `/{locale}/best/{slug}` | Editorial lists ("best free", "best with voice", "best for roleplay") | Curated filters on top of data |
| Feature filter | `/{locale}/apps?feature=voice&price=free` | Faceted browse | `noindex` for filter combos unless whitelisted |
| New apps | `/{locale}/new` | Recently added | Freshness signal |
| Methodology | `/{locale}/how-we-rank` | How scores are made, independence, affiliate disclosure | Trust + E-E-A-T |
| About / Contact / Legal | `/{locale}/about`, `/privacy`, `/terms`, `/affiliate-disclosure`, `/imprint` | Required | |
| Outbound redirect | `/go/{app-slug}?src={placement}` | Logs click, 302 to affiliate URL | `noindex`, `rel="sponsored nofollow"` on all links to it |

## 3. App detail page — required blocks

1. Header: logo, name, one-line description, overall score (0–10), primary CTA ("Visit {App}") → `/go/{slug}`.
2. Quick facts: free plan (y/n), starting price, platforms (web/iOS/Android), languages, NSFW allowed (y/n, shown only past age gate), voice, image generation, memory.
3. Score breakdown: Conversation quality, Memory, Customization, Media (voice/images), Pricing value, Privacy & safety. Each 0–10, with 1–2 sentence justification.
4. Pricing table (plans, monthly/yearly, tokens/credits). **Each value has a source URL + checked date.**
5. Pros / cons (max 5 each).
6. Privacy & safety summary: data retention, deletion, training on chats, payment discretion (billing descriptor), company/jurisdiction.
7. Screenshots (own screenshots only, SFW, see legal doc).
8. "Best for" tags + "Alternatives" block (3–5 related apps).
9. FAQ (3–6 Q&A, schema.org FAQ).
10. Last verified date + "report outdated info" link (mailto or simple form).

## 4. Ranking & scoring

- Overall score = weighted average of sub-scores. Default weights (configurable in admin): Conversation 25%, Memory 15%, Customization 15%, Media 15%, Value 20%, Privacy 10%.
- **Affiliate payout must NOT affect score.** Paid placements (Phase 3) are visually labeled "Sponsored" and shown in separate slots, never inside the ranked order.
- Each app re-verified at least every 60 days; stale apps get a visible "being re-checked" badge after 90 days.

## 5. Data model (initial)

```
App
  id, slug, name, tagline, description_md (per locale via Translation)
  website_url, affiliate_url_env_key (name of env var / secret ref, NOT the URL itself if it contains IDs) | affiliate_link_id → AffiliateLink
  logo_asset_id, screenshots[] (Asset)
  platforms[] (web|ios|android|desktop|telegram|discord)
  pricing_plans[] (PricingPlan)
  has_free_plan, starting_price_cents, currency
  features: voice, image_gen, video, memory_long_term, group_chat, custom_character, api
  nsfw_allowed (bool), nsfw_requires_toggle (bool)
  company_name, company_country, privacy_policy_url
  scores: conversation, memory, customization, media, value, privacy (int 0–100)
  status (draft|published|paused|removed), removal_reason
  verified_at, created_at, updated_at
  sources[] (Source)

Category: id, slug, name/desc per locale, parent_id, sort, is_nsfw (bool)
AppCategory: app_id, category_id, rank_override (nullable)
PricingPlan: app_id, name, price_cents, currency, period (month|year|lifetime|credits), notes, source_id
Source: id, app_id, url, field (what it supports), checked_at, archived_url
AffiliateLink: id, app_id, network (direct|crakrevenue|other), model (revshare|cpa|pps|hybrid), terms_summary, url_secret_ref, active, source_id
Click: id, app_id, link_id, placement, locale, country, device, referrer_path, ts  (no IP stored raw; hash + daily salt)
Comparison: id, app_a, app_b, locale, verdict_md, published (only whitelisted pairs)
Translation: entity, entity_id, field, locale, value, status (machine|reviewed)
AdSlot (Phase 3): id, placement, app_id, starts_at, ends_at, price_cents, label="Sponsored"
```

## 6. Admin (internal only)

- Auth: single owner + optional editor accounts (strong auth, 2FA). Not publicly reachable or behind IP allowlist / Cloudflare Access.
- CRUD for apps, categories, pricing, sources, affiliate links, comparisons, translations.
- "Verification queue": apps sorted by `verified_at` oldest first.
- Click stats per app / placement / locale / day.
- Bulk translate (LLM) → status `machine`; editor marks `reviewed`.

## 7. User flows

1. Google "best ai girlfriend app" → category page → scans ranked list → app detail → clicks CTA → `/go/{slug}` → affiliate site.
2. Google "candy ai alternatives" → alternatives page → picks one → `/go/...`.
3. First visit to any page showing NSFW-related info → age gate (see legal) → stored in cookie 30 days.

## 8. Non-functional

- Core Web Vitals green on mobile (LCP < 2.0s, CLS < 0.05, INP < 200ms).
- Pages statically generated / ISR; HTML size small; images AVIF/WebP, lazy-loaded.
- Accessibility WCAG 2.1 AA.
- No third-party trackers beyond privacy-friendly analytics; cookie banner only if needed.
