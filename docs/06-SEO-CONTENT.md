# 06 — SEO & CONTENT

## Keyword clusters (to be sized in TASK-005)

| Cluster | Example queries | Page type |
|---|---|---|
| Head / category | best ai girlfriend app, ai companion app, ai boyfriend app, ai chat characters | Category ranked list |
| Modifiers | free, no filter, with voice, with pictures, no sign up, android, iphone, uncensored, for roleplay | Best-of lists / filtered categories |
| Brand | {app} review, is {app} safe, {app} pricing, {app} free | App detail page |
| Alternatives | {app} alternatives, apps like {app}, sites like {app} | Alternatives page |
| Versus | {app a} vs {app b} | Comparison page |
| Informational | how do ai companions work, are ai girlfriends safe, ai companion privacy | Guides (fewer, high quality) |
| Locale | same in DE/FR/ES/IT/PT/PL/NL/JA/KO… | Localized pages |

## Content rules

- **Real testing**: each review is based on actually using the app (account, free tier at minimum). Store test notes + own screenshots. This is our moat versus AI-generated spam.
- **Data first**: pricing tables, feature matrix, privacy facts — all with sources and dates.
- **Templates + human/LLM text**: pages are built from structured data; free text (summary, verdict, pros/cons) is drafted by LLM from test notes, then edited. Never publish unedited LLM text for top-50 pages.
- **No thin pages**: a page gets published only if it has unique data (minimum: score breakdown, pricing, 3 pros/3 cons, verdict). Comparisons only for pairs with search volume.
- **Freshness**: show "Last verified: {date}"; re-verify per `01-PRODUCT-SPEC` §4.
- **SFW language** on indexable pages (ADR-003).
- Every page: affiliate disclosure line near top ("We may earn a commission…" with link to `/affiliate-disclosure`).

## Templates (to write in `/content/templates`)

- Category page: intro (80–120 words), ranked list, "how we ranked" box, comparison table of top 5, FAQ (4–6).
- App review: see `01-PRODUCT-SPEC` §3.
- Comparison: verdict up top ("Pick A if…, pick B if…"), side-by-side table, section per criterion, FAQ.
- Alternatives: why look for alternatives, ranked list with "better than X at…" line.

## Translations

- Machine translate via LLM with a glossary (brand terms, feature names, untranslated app names) and per-locale style notes.
- Reviewed by native speaker for top pages in top 5 locales (budget).
- Localize prices/currency display where vendors show local prices; otherwise show USD with note.

## Technical SEO checklist (per release)

- Titles ≤ 60 chars, meta descriptions ≤ 155, unique per page and locale.
- Canonicals, hreflang, sitemaps, robots.txt (block `/go/`, `/admin/`, filter params).
- Schema validates (Rich Results Test).
- CWV green on mobile.
- Internal linking: every app page links to its categories, alternatives and 2–3 comparisons; categories link to top apps and related categories.

## Off-page / traffic (no spam)

- Reddit: genuinely helpful answers in relevant subreddits (respect each sub's self-promo rules), occasional data posts (e.g. "We compared pricing of 50 AI companion apps").
- X / TikTok / YouTube Shorts: comparison clips, "app of the week" (SFW).
- Link building: data studies (pricing index, privacy report card) that journalists and bloggers cite; listing on AI tool directories; partnerships/link swaps with relevant directories (editorial, no paid links that violate guidelines).
- Newsletter: "New AI companion apps this week" — owned channel, reduces Google dependence.
- Do NOT: buy PBN links, mass-generate pages without data, spam forums, cloak content.
