# TASK-005 feedback — keywords & competitors
Status: PARTIAL — no search volumes (no keyword tool connected); everything else delivered

## Delivered
- `docs/research/keywords.csv`: 475 keywords (371 in scope) with cluster, intent, page type, target app + its seed status, evidence URL. Built by `scripts/kw-build.py` from `raw/kw/` (30 head terms checked with WebSearch, 455 Google Autocomplete suggestions incl. DE/FR/ES/IT/PT).
- `docs/research/COMPETITORS.md`: 13 competitor profiles (page types, freshness, monetisation, weaknesses).
- `docs/research/KEYWORDS.md`: v1 sitemap proposal — 12 list pages, 8 alternatives pages, comparison whitelist with evidence, 4 guides, locale order.
- `scripts/kw-import-volumes.py`: merges Google Ads Keyword Planner exports into keywords.csv.

## Deviations
- Volume/difficulty columns empty — not estimated (hard rule). Top-50 comparison pairs by volume therefore not possible yet; whitelist uses autocomplete evidence.
- SERP data is from the WebSearch tool (9 results), not Google.
- Excluded on purpose: minors, age-verification evasion, "with my photo", piracy, image-generator queries.

## Owner
Approve the sitemap; connect Google Ads or send a Keyword Planner export.
