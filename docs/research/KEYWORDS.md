# Keywords & v1 sitemap proposal (TASK-005)

Checked 2026-10-29. Data: `keywords.csv` (475 keywords, 371 in scope), raw evidence in `raw/kw/`.
Rebuild: `python3 scripts/kw-build.py`. Add volumes: `python3 scripts/kw-import-volumes.py <locale> <planner-export.csv>`.

## What the data is — and isn't
- **Keyword universe** = our 30 head terms + 455 Google Autocomplete suggestions for 60 seeds (EN + DE/FR/ES/IT/PT), each with its source URL. Autocomplete proves people type the query; it says nothing about volume.
- **No search volumes or difficulty yet.** No keyword tool is connected (Google Ads / Microsoft Ads not connected in Supermetrics; no Ahrefs/Semrush). Per the hard rules nothing was estimated. The `volume*` columns stay empty until a Keyword Planner export is imported. Planner "competition" is *ads* competition, not SEO difficulty.
- **Rankings** come from the WebSearch tool (9 results per query), not a logged-out Google SERP — treat them as a signal.

## Clusters (in scope)
| Cluster | # | Page type | Notes |
|---|---|---|---|
| head | 56 | category list | girlfriend, boyfriend, companion, roleplay/characters, waifu, virtual girlfriend, partner/lover |
| modifier | 39 | best-of list | free / no sign-up / android / iphone / voice / pictures / memory / no filter / no in-app purchases |
| alternatives | 21 | alternatives | Replika, Character.AI, Janitor AI, Candy AI, Chai |
| versus | 22 | comparison | Kindroid ↔ Nomi ↔ Replika dominate; Kindroid vs Candy/OurDream/SpicyChat/Chai; Candy vs Chai |
| brand | 91 | app review (+ FAQ sections) | "is X safe / free / worth it / private / easy to cancel" → review page FAQ |
| informational | 12 | guide | are AI girlfriends safe / real / legal / worth it; AI companion privacy |
| forum-intent | 11 | category list citing community sentiment | "… reddit" queries |
| brand-navigational | 46 | low value | login, down, codes, discord — not targeted |
| locale | 73 | localized category | ES/PT strongest pattern: "gratis sin registro", "telegram"; FR "en français gratuit"; DE "app deutsch kostenlos" |

**Never targeted** (status `exclude`, 104): queries about kids/teens, age-verification evasion ("apps like character ai without age verification"), "with my photo" (real-person images), mod/APK piracy, image generators, off-topic (robots, movies, seniors devices, gemstones…).

## v1 sitemap proposal (for owner approval)
### Category / best-of list pages (12)
1. `ai-girlfriend-apps` — best AI girlfriend apps (head)
2. `ai-boyfriend-apps`
3. `ai-companion-apps` — general/friend companions (SFW-first entry point)
4. `ai-roleplay-character-chat` — roleplay & character chat
5. `free-ai-companion-apps` — free plan required (also "no sign-up" section)
6. `ai-companions-with-voice` — voice messages/calls
7. `ai-companions-with-pictures` — in-chat image generation
8. `ai-companions-with-memory` — advertised long-term memory
9. `cheap-ai-girlfriend-apps` — entry plan ≤ $10/month (answers "without in-app purchases" / price queries with data)
10. `ai-companion-apps-iphone` · 11. `ai-companion-apps-android`
12. `nsfw-ai-chat` — adults-only category, gated + `noindex` (ADR-025/026)

Each list is filled automatically from facts (free plan, voice, images, memory, price, platforms) — no hand-picking, ranking by our score (ADR-005).

### Alternatives pages (v1: 8, grow to 30 with volume data)
Replika · Character.AI · Janitor AI · Candy AI · Chai · Kindroid · Nomi · Talkie.
An alternatives page may name an app we don't list (e.g. Character.AI is excluded) — it lists only published apps.

### Comparison whitelist (v1: pairs with autocomplete demand where both apps are listable)
| Pair | Evidence | Listable now? |
|---|---|---|
| Kindroid vs Nomi | "kindroid vs nomi", "nomi vs kindroid", "nomi ai vs kindroid", "… reddit" | yes |
| Kindroid vs Candy AI | "kindroid vs candy" | yes |
| Kindroid vs OurDream | "kindroid vs ourdream" | yes |
| Nomi vs Replika | "replika vs nomi", "nomi vs replika" | Replika on hold (owner) |
| Kindroid vs Replika | "replika vs kindroid", "kindroid vs replika" | Replika on hold |
| Kindroid vs SpicyChat | "kindroid vs spicychat" | SpicyChat on hold |
| Candy AI vs Chai / Kindroid vs Chai | autocomplete | Chai on hold |
| Replika vs Character.AI, Kindroid vs Character.AI | autocomplete | **no** — Character.AI excluded |
"Top 50 pairs by volume" needs Keyword Planner data; until then only pairs with evidence above.

### Guides (v1: 4)
Are AI girlfriend apps safe? · AI companion privacy (our privacy score data) · Are AI girlfriend apps free? (free-plan data) · How AI companion memory works.

### Locales
Order proposal from autocomplete richness only (no volumes): **ES, PT, FR, DE, IT**. Revisit with volumes.

## Owner action that unlocks volumes
Create a free Google Ads account (no campaign or spend needed; without spend Keyword Planner shows ranges) and either
connect it in Supermetrics (link given in chat) **or** export "Get search volume" for `keywords.csv` → send the CSV file
(it is not secret) → `kw-import-volumes.py` fills the columns.
