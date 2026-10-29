# APPS-SEED — app universe (TASK-006)

Date checked: 2026-10-29 · Method: 6 parallel research runs (affiliate list, mainstream, adult platforms, app stores, web directories, voice/bots/hardware) following `APPS-SEED-BRIEF.md` — public SFW pages only (terms, privacy, pricing, store listings, press). Raw results: `raw/batch-*.json`; merge: `scripts/merge-app-research.py` (strictest status wins on duplicates; terms that admit under-18 users → never `candidate`).

**125 apps**: 43 candidate · 60 hold · 22 excluded. File: `APPS-SEED.csv` (importable: `/admin/import` creates drafts for candidates only and skips hold/excluded; guarded by `src/lib/admin/apps-seed.test.ts`).

## What a status means
- **candidate** — operator, terms and sources found; may be imported as a *draft*. Still needs the manual checks below before publishing.
- **hold** — something essential is missing or an owner decision is needed (reason in `exclusion_reason`).
- **excluded** — must never get a public page (reason + source).

## Never automated (human must do before publishing)
- **Gallery check for minor-coded content** (07-LEGAL §2.1) — agents were told not to open galleries or explicit pages. Priority: anime-style and user-generated-character platforms (SecretWaifu, Janitor AI, Flipped.chat, CraveU, PolyBuzz, Kajiwoto, Voxta Hub, Moemate).
- Real hands-on test (06-SEO-CONTENT) — account, free tier, notes, own screenshots.
- Prices: many sites show prices only at checkout; `starting_price` is filled only where a pricing page or store listing showed it.
- "Top 50 by search demand" needs keyword data (TASK-005, not done) — no ranking was invented.

## Owner decisions (holds)
- **Consented AI twins of real creators** — Swipey AI, heyGF, SweetBun: allowed under the deepfake rule if consent is documented? (default: no)
- **Celebrity / real-person characters** — Joi AI ("Celebrities" category), HiWaifu, Sakura ("duplicates of real people").
- **Services open to minors** — Tolan, Kuki, Talkie, Dopple, AI Dungeon, Linky AI, Couple.me (age wording), Nectar AI (under-18 SFW areas): the adults-only rule says no.
- **Child-safety history** — Replika (Garante fine 2025), Chai (US senators' letter 2025): list with context, or not?
- **Scope** — hardware/robots (LOVOT, Moflin, ElliQ, Gatebox, Friend, Dipal, Razer AVA), NovelAI (story tool), Pi/Sesame (assistants), dating coaches.
- Many small store-only apps are on hold because no operator address could be found.

## Excluded (never listed)
| App | Reason (short) |
|---|---|
| AI Companion - Character Chat | Rated 13+ and advertises 'homework help' (school-age framing) alongside companion roleplay that carries a sexual content descriptor. |
| AIBoy | App Store listing advertises chatting with 'celebrities you admire', and release notes add 'Celebrity characters' alongside photo/video generation, w… |
| Botify AI | Credible press report of child-safety failures. MIT Technology Review (2025-02-27) found featured bots resembling underage celebrity characters engag… |
| Character.AI | Credible public reports of child-safety failures: lawsuits over a 14-year-old's suicide and over bots encouraging minors to self-harm; a bot modeled … |
| CherryPop AI | Site navigation markets a 'Teen (18+)' character category, which is teen-coded content under the content policy (homepage, https://cherrypop.ai/). |
| Chub AI | Credible child-safety report: Graphika 'Character Flaws' (2025-03-05) found 7,140 Chub AI chatbots labeled as sexualized minor female characters plus… |
| CrushOn.AI | Credible public child-safety report: Graphika 'Character Flaws' (2025-03-05) surveyed CrushOn.AI and shows a CrushOn.AI chatbot (46.9k chats) imitati… |
| Grok Companions (xAI) | Grok complied with requests to 'undress' images of real people, including altering images of minors into revealing clothing; Ofcom and the California… |
| hAI! Friend MR | Advertises creating the companion's animated avatar from an uploaded photo (real-person likeness risk, hard rule on deepfakes); also no developer/ope… |
| Lustix | Not a companion app — an erotic story/image/video generator, not one-on-one companion chat. |
| Meta AI Studio | Credible public child-safety report: Reuters (via Engadget, 2025-08-14) reported internal Meta AI guidelines permitted 'sensual' chatbot conversation… |
| Muah AI | Credible public report of child-safety failure: Oct 2024 breach (reported by 404 Media) exposed prompts discussing underage sex and explicit referenc… |
| Promptchan AI | Not a companion app: the terms centre on 'text-to-image diffusion models' and 'All images generated', and most homepage content is image editing and … |
| Secret Desires AI | Previously offered a face-swap tool used to put real people's faces onto explicit images; Nov 2025 leak (404 Media) exposed ~2M images including deep… |
| Seduced | Not a companion app: it describes itself as 'Not an AI girlfriend', and its terms call it 'an advanced AI-powered image generation platform'. It also… |
| Snapchat My AI | Credible public child-safety report: FTC referred a complaint to the DOJ alleging My AI poses risks to young users; platform open to users from 13 |
| SoulGen | Not a companion app (primarily an image/video generator); also advertises uploading a reference photo to draw a character 'with the face of someone l… |
| SpicyGen | Not a companion app: the terms describe a platform to 'generate images and short videos using artificial intelligence', and the homepage has no chat/… |
| SugarLab AI | Not a companion app: homepage headline presents it as an explicit image/video generator, with chat secondary (https://www.sugarlab.ai/). |
| VoiceGF | Logged-out homepage markets coercive / non-consensual and incest-themed character scenarios (07-LEGAL hard rule: non-consensual content); no operator… |
| xMode AI | Advertises face swaps (deepfake/face-swap feature), and is a content generator for creators rather than a companion/chat app (homepage meta descripti… |
| zeta | Credible press report: Korea Herald (2025-09-10) describes ~1M mostly teenage users, a 12+ store rating, reporter easily steering a character into er… |

## Candidates
| App | Operator | NSFW | Affiliate id |
|---|---|---|---|
| AI Angels | AiAppDevelopment OÜ (EE) | yes | — |
| Blush | Endura LLC (US) | yes | — |
| Candy AI | EverAI Limited (MT) | unknown | 2 |
| CraveU AI | COZYAI LLC (US) | unknown | 27 |
| Dream AI Companion | Forwardpath Technologies LLP (?) | yes | — |
| DreamBF | DreamAI SRL (RO) | unknown | — |
| DreamGF | DreamAI SRL (RO) | unknown | 9 |
| ElliQ | Intuition Robotics Ltd. / Intuition Robotics Inc. (US) | unknown | — |
| Erogen | Corinth LLC (US) | unknown | — |
| EVA AI | NOVI LIMITED (CY) | unknown | — |
| Fantasy.ai | DreamAI SRL (RO) | yes | — |
| FantasyGF | ADVANCED AI LABS S.R.L. (RO) | unknown | 6 |
| Flipped.chat | SINGAPORE DESERT OASIS TECHNICAL PTE. LTD. (SG) | unknown | 10 |
| FunFun AI | Chaindesk SAS (FR) | yes | — |
| GirlfriendGPT | NextDay AI Incorporated (CA) | yes | 8 |
| GoLove AI | 404 Intelligence LTD (CY) | unknown | 21 |
| HeraHaven | Vilala Limited (CY) | unknown | 26 |
| Janitor AI | JanitorAI, INC (?) | unknown | — |
| Kajiwoto | Kajiwoto Inc. (?) | unknown | — |
| Kindroid | BEAUTIFULLY INCORPORATED (US) | unknown | — |
| Kupid AI | Servalot Ltd (CY) | yes | 5 |
| LOVERSE | Samansa Co., Ltd. (JP) | no | — |
| Lovescape | Warmtech Ltd (CY) | yes | 17 |
| LOVOT | GROOVE X, Inc. (JP) | no | — |
| Luvr AI | LUVR INC. (US) | yes | — |
| Moemate | Webaverse, Inc. (?) | unknown | — |
| Moflin | Casio Computer Co., Ltd. (JP) | no | — |
| My Dream Companion | Miracle AI UG (haftungsbeschränkt) (DE) | yes | — |
| Nastia AI | Nastia Cybernetics (FR) | yes | — |
| Nemora AI | G.A CONTEXT AI SOLUTIONS LTD (CY) | unknown | 24 |
| Nomi | Glimpse.ai, Inc. (US) | unknown | 4 |
| NovelAI | Anlatan Inc. (US) | unknown | — |
| OurDream.ai | Dream Studio USA, Inc. (US) | unknown | 3 |
| Pi | Inflection AI, Inc. (US) | unknown | — |
| PolyBuzz | Singularity Mutual Entertainment Culture Media Limited (HK) | no | — |
| Romantic AI | Just Web It Oy (Zemomedia) (FI) | yes | — |
| Secrets AI | Secret Labs Inc. (US) | unknown | 7 |
| SecretWaifu | Mihi Marketing BV (BE) | yes | — |
| Sesame | Sesame AI, Inc. (US) | no | — |
| SweetDream AI | Tetractys Development Ltd (GB) | yes | — |
| TenderTalk | UX App Builder Limited (GB) | no | — |
| Voxta | Voxta LLC (US) | unknown | — |
| xchar | Always is Now Inc. (US) | yes | — |

## Gaps vs. the task
- 125 apps instead of 150+: the remaining searches mostly surfaced clones or apps without an identifiable operator. A second pass should target EU/Asian markets and Telegram bots.
- Checklist complete for top 50: not possible yet (needs TASK-005 + manual gallery checks).

