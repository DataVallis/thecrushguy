# Affiliate programs: research (TASK-004)

- Date checked: 2026-10-29. All research was done on the web; no accounts were created and no applications were sent.
- Machine-readable copy (one row per program, all fields): `docs/research/affiliate-programs.csv`
- Confidence labels: **Official** means the program's own page or terms. **Official (partial)** means the official page gives only some terms. **Platform listing** means the program's page on the Tapfiliate marketplace. **Third-party** means an affiliate review site such as affninja, affmaven, affinco, affpaying or zplatform; these sites earn from the links they publish. "not found" means no source stated the value. No number in this file is estimated.

## 1. Summary

- **30 programs documented.** One is a network (CrakRevenue) and 29 are direct or in-house programs.
  - 8 have official terms: Candy AI, OurDream.ai, Nomi, Kupid, Secrets AI, SpicyGen and Promptchan, plus Flipped.chat from its application form.
  - 3 have official but partial terms: CrakRevenue, FantasyGF and DreamGF.
  - 3 come from Tapfiliate marketplace listings: GirlfriendGPT, CherryPop and VoiceGF.
  - The rest rely on third-party review sites only.
- **The core of the market pays lifetime revenue share of 30–45%,** sometimes with a CPA alternative of $26–$70. Candy AI (up to 40% lifetime or CPA up to $70) and OurDream.ai (up to 40% lifetime or CPA $26–$70) are the strongest programs that are confirmed officially.
- **"Lifetime" is often not lifetime.** Official terms show caps:
  - Secrets AI: revenue share for 6 months.
  - GirlfriendGPT: 12 months.
  - Promptchan: first 5 payments.
  - Reez: 60 days.
  - CrushOn: 12 months (third-party source).

  Third-party sites still describe Secrets AI as "lifetime".
- **Mainstream SFW companion apps rarely run public programs.** Nomi (30% lifetime, run on Rewardful) is the only strong SFW-leaning brand with a public program. No public affiliate program was found for:
  - Replika
  - Kindroid
  - Character.AI (a third-party directory says it has none as of June 2026)
  - Talkie
  - Chai

  These apps were searched, but none were found on Impact, PartnerStack, Rewardful or FirstPromoter. They can still be listed without an affiliate link.
- **Voice companions:** only VoiceGF was found. It pays 50% of the first payment only, with a 45-day cookie.
- **Rules that recur in most programs:**
  - No bidding on brand keywords. This applies to Candy, Nomi (only with written consent), Secrets, GirlfriendGPT, CherryPop, VoiceGF and SpicyGen.
  - No incentivized or cashback traffic.
  - No promotion that minors are likely to see.
  - Adult-material geo limits. Candy and Secrets explicitly require compliance with local age-verification rules.

## 2. Seed verification (04-BUSINESS-MODEL.md)

| Seed claim | Status | What the sources say | Source |
|---|---|---|---|
| CrakRevenue: AI companion offers up to 50% lifetime revshare | **Different / not confirmed officially** | The official homepage shows "AI Companion – Revshare 30.00%". The official help center confirms that a "Revshare Lifetime" type exists ("never expires"). "Up to 50%" appears only on third-party sites. | crakrevenue.com; intercom.help/crakrevenue 792110; affninja.com/crakrevenue-review |
| CrakRevenue: also CPA/PPS | **Third-party only** | affmaven reports PPS up to $50 plus PPL, SOI and DOI. Not shown on the official pages checked. | affmaven.com/ai-dating-affiliate-programs |
| CrakRevenue: 5% lifetime sub-affiliate referral | **Confirmed** | Official: "5% of each referred affiliate's daily earnings … for as long as he is with CrakRevenue" | intercom.help/crakrevenue 805161 |
| CrakRevenue: $60M+ paid yearly | **Not found (official)** | The figure appears only in a third-party review. The official site shows "100 Million Monthly Clicks". | affninja.com/crakrevenue-review |
| Candy AI: ~40% lifetime revshare | **Confirmed** | Official: "Up to 40% revshare for life", with no expiry and no cap. The page also lists CPA up to $70 and a 90-day cookie. The minimum payout is $250 (Everflow track) or $100 (FirstPromoter track). | candy.ai/affiliate; candy.ai/affiliate-terms/everflow |
| Candy AI: via CrakRevenue / direct | **Direct confirmed; CrakRevenue third-party only** | Official tracks are Everflow and FirstPromoter. | candy.ai/affiliate-terms |
| FantasyGF: up to 50% lifetime revshare | **Confirmed (headline only)** | The official page's headline and metadata say "earn up to 50% lifetime rev-share". The page body gives no cash terms. | fantasygf.com/affiliate |
| FantasyGF: via CrakRevenue | **Third-party only** | Stated by affninja and affmaven. | affninja.com/crakrevenue-review |
| OurDream.ai: 40% lifetime revshare | **Confirmed** ("up to 40%", lifetime) | Official program page | ourdreamaiaffiliate.com |
| OurDream.ai: up to $50 CPA | **Different** | Official: CPA $26–$70 by geo, level and plan | ourdreamaiaffiliate.com |
| OurDream.ai: in-house (Everflow) | **Confirmed** | Official | ourdreamaiaffiliate.com |

## 3. Full table (sorted by EV score)

The table shows the main fields. The CSV also has: apps, commission model, other sources, brand strength, policy flag and notes.

| id | name | type | rate | lifetime_or_capped | cookie_window | payout_threshold | payout_methods | geo_limits | traffic_restrictions | approval | platform | confidence | ev_score | source_url |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 | Candy AI | direct | Up to 40% RevShare; CPA up to $70 per new paying customer (by country/traffic quality) | Lifetime, 'no expiry and no cap'; subscriptions, renewals, tokens; refunds/chargebacks deducted | 90 days; user attributed permanently after signup | $250 (Everflow terms); $100 (FirstPromoter terms) | PayPal, bank wire, USDT/crypto; monthly (page: Net-7; FirstPromoter terms: Net 15) | Only where distribution/sale of adult material is not forbidden; comply with local age verification | No brand bidding (any match type); no incentivized/cashback; no spam/content locking/deceptive redirects; no typo-squat domains; no NCII/deepfakes; no placement likely seen by children | Application via signup form (describe audience) | Everflow and FirstPromoter (two tracks) | Official | 12.0 | https://candy.ai/affiliate |
| 3 | OurDream.ai | direct | Up to 40% RevShare; CPA $26 (Tier 3, monthly) to $70 (Pro level, yearly) | Lifetime RevShare | Last-touch, 180-day window; 30-day full-protection bond after signup | $100 (PayPal/bank); $1,000 (crypto) | PayPal (all levels); BTC/USDT from 'Pink VIP'; bank transfer from 'Pro'; monthly NET-15 | CPA geo-tiered; 27 Tier-1 countries listed | 18+ audiences only; follow each platform's rules; no explicit brand-bidding rule found | Everflow application, 24-48h review (page metadata also says 'no application needed' - contradictory) | Everflow | Official | 12.0 | https://ourdreamaiaffiliate.com |
| 4 | Nomi AI | direct | 30% | Lifetime recurring (monthly, quarterly, yearly subs) | Not specified; last-link attribution | > $100 unpaid commissions | PayPal given as example; monthly with 30-day hold | None stated | Brand keyword bidding ('Nomi', 'Nomi.ai') only with written consent; only portal coupon codes; no cookie stuffing/click fraud/spyware | Google Form application; acceptance by email | Rewardful | Official | 9.0 | https://nomi.ai/nomi-ai-girlfriend-affiliate-program/ |
| 5 | Kupid AI | direct | Official page: 45% (third-party sources say 30% or 40%) | Lifetime on every renewal | Unlimited, first-touch | Official: not listed. Third-party: $50 | Official: not stated; paid monthly. Third-party: PayPal, wire, crypto via Dub Partners / MyLead | not found | Official: none listed. Third-party: no incent, spam or pop traffic | Short application, 'quick review' | Official: not named (third-party: Dub Partners) | Official | 9.0 | https://kupid.ai/become-an-ai-girlfriend-affiliate |
| 6 | FantasyGF | direct (also network per third-party) | Up to 50% (official page headline/metadata only) | Lifetime (per official headline) | Official: not stated. Third-party: unlimited | Official: not stated. Third-party: $100 | Official: not stated. Third-party: PayPal, wire | not found | not found | Separate webmaster application form (Google Form per Tapfiliate blog) | In-house; CrakRevenue per third-party | Official (headline only) + third-party | 8.0 | https://fantasygf.com/affiliate |
| 1 | CrakRevenue | network | Official homepage: 'AI Companion - Revshare 30.00%'. Third-party: AI companions up to 50% lifetime RevShare; PPS up to $50. Webmaster referral: 5% of referred affiliates' earnings | Lifetime RevShare type exists ('never expires', official help center); per-offer terms not public | not found | Official: not stated. Third-party: $100 (MassPay/PayPal/Paxum), $500 (Bitcoin/wire) | Official: Paxum mentioned. Third-party: MassPay, PayPal, Paxum, Bitcoin, wire | not found | Third-party: no spam, content locking, VPN/proxy or dedicated-server traffic; adult-friendly placements only | Third-party: manual compliance review (24-48h), ID verification before first payout; dedicated AM | Own platform; payments bi-monthly Net 30 (official, terms may vary per affiliate) | Official (partial) + third-party | 7.2 | https://www.crakrevenue.com/ |
| 10 | Flipped.chat | direct | Up to 30% | Lifetime (renewals, upgrades, subs) | not found | not found | Monthly; methods not stated | not found | not found | Google Form application; affiliate@flipped.chat | not found | Official (application form) | 6.0 | https://docs.google.com/forms/d/e/1FAIpQLSfH-e75ppBzM6-u8bRkWh2sv7oYsrG8sxPbjqr3r0zFAqWvQw/viewform |
| 16 | Joi AI | direct / network | Up to 50% (affninja); no figures (affinco) | Lifetime (affninja) | not found | $500 | Bank wire, crypto; NET15 (affinco) | not found | not found | not found | CrakRevenue (affninja) | Third-party | 6.0 | https://affninja.com/ai-dating-affiliate-programs/ |
| 15 | SugarLab AI | direct / network | Up to 50% RevShare | Lifetime (affninja, affinco) vs 'recurring' (affmaven) | 30 days (affmaven, affninja) vs lifetime (affinco) - conflicting | not found | PayPal (affmaven); PayPal, bank, crypto (affinco) | not found | not found | not found | CrakRevenue (affninja) | Third-party (conflicting) | 5.0 | https://affinco.com/ai-dating-affiliate-programs/ |
| 24 | Nemora AI | direct | 50% | Lifetime | not found | not found | PayPal, bank transfer; monthly | not found | not found | Tapfiliate signup | Tapfiliate (contextai.tapfiliate.com) | Third-party (platform blog) | 4.0 | https://tapfiliate.com/blog/best-ai-companion-affiliate-programs-cck/ |
| 7 | Secrets AI | direct | Official: not public (terms forbid public disclosure). Third-party: 40% RevShare or CPA up to $50 (affpaying) / $70 (affninja) | CAPPED: RevShare for up to 6 months from first qualifying transaction (official terms); CPA one-time | 30 days, last click; locks at registration (official). Third-party says 90 days | $100 | PayPal, crypto, wire; within 15 days after month end; invoice + KYC required | No promotion where such services are restricted; age-gating required on adult properties | No brand bidding ('Secrets.ai', 'Secret Labs'); no incentivized/cashback, bots, cookie stuffing, spam, forced redirects; no minor content; no real-person likeness/deepfakes/voice clones; no NSFW where minors present; chargeback >1%/2%/3% sanctions | Everflow signup; audit rights | Everflow | Official (terms) | 3.2 | https://secrets.everflowclient.io/affiliate/signup |
| 8 | GirlfriendGPT | direct | 40% | Capped: 12 months | 30 days | $100 | PayPal; Net-30 | not found | No brand bidding on search/social ads; no spam; no deceptive pop-ups; no parasiteware | Tapfiliate signup | Tapfiliate | Platform listing | 3.2 | https://tapfiliate.com/offers/gptgirlfriend-affiliate-program/ |
| 14 | aiAllure | direct | 50% on new and recurring Pro memberships and tokens | Recurring; lifetime not stated | 30 days (affinco) | not found | Weekly (Tuesdays); bank transfer, crypto (affinco) | not found | not found | not found | In-house (per third-party) | Third-party | 3.0 | https://affninja.com/aiallure-affiliate-program/ |
| 18 | Xtease AI | network | Up to 50% RevShare | Lifetime | not found | not found | not found | not found | not found | not found | CrakRevenue | Third-party | 3.0 | https://affninja.com/ai-dating-affiliate-programs/ |
| 11 | CherryPop AI | direct | 35% or $30-$40 per sale | Lifetime (advertised) | 30 days | $20 | PayPal; monthly | USA and Europe | No brand bidding; no spam; no deceptive pop-ups; no parasiteware; no promotion to minors | Tapfiliate signup | Tapfiliate | Platform listing | 2.8 | https://tapfiliate.com/offers/cherrypop-ai-affiliate-program/ |
| 19 | DarLink AI | unknown | 45% RevShare or $30 PPS | not found | not found | not found | not found | not found | not found | not found | not found | Third-party | 2.7 | https://affninja.com/ai-dating-affiliate-programs/ |
| 22 | CrushOn AI | direct | Up to 30% | Capped: 12 months | 30 days | not found | not found | not found | not found | Tapfiliate signup (crushonai.tapfiliate.com) | Tapfiliate | Third-party (platform blog) | 2.4 | https://tapfiliate.com/blog/best-ai-companion-affiliate-programs-cck/ |
| 13 | Nectar AI | direct | 30% | Recurring (duration not stated) | Lifetime | $100 | PayPal, Wise, crypto; on request | Worldwide, Tier-1 preferred | not found | Everflow signup (nectar.everflowclient.io) | Everflow | Third-party | 1.8 | https://www.affpaying.com/nectaraiaffiliate |
| 17 | Lovescape | direct / network | Up to 35% RevShare or up to $42 PPS (affninja) vs 'up to 40%, coming soon' (affinco) | not found | not found | not found | not found | not found | not found | Manual, ~24h (affinco) | CrakRevenue (affninja) | Third-party (conflicting) | 1.8 | https://affninja.com/ai-dating-affiliate-programs/ |
| 20 | Swipey AI | unknown | 28% RevShare or $32 PPS | not found | not found | not found | not found | not found | not found | not found | not found | Third-party | 1.7 | https://affninja.com/ai-dating-affiliate-programs/ |
| 9 | DreamGF | direct | Not disclosed ('High Revenue Share') | Recurring every month while referred member is active | not found | not found | not found | not found | not found | 'Make Request' via traceo.io | traceo.io | Official (partial) | 1.6 | https://www.dreamgf.ai/affiliate |
| 21 | GoLove AI | direct | Up to 65% | unclear | not found | $50 | PayPal, bank transfer | not found | not found | not found | not found | Third-party | 1.6 | https://affinco.com/ai-dating-affiliate-programs/ |
| 23 | xMode AI | direct | 30% | Conflicting (recurring vs lifetime) | 60 days (table) vs not indicated - conflicting | not found | not found | not found | not found | Tapfiliate signup | Tapfiliate (thedream.tapfiliate.com) | Third-party (conflicting) | 1.5 | https://tapfiliate.com/blog/best-ai-companion-affiliate-programs-cck/ |
| 12 | VoiceGF | direct | 50% of referral's first payment | One-time | 45 days | $20 | PayPal; monthly | Worldwide | No brand bidding/paid search on brand; no spam; no deceptive pop-ups; no parasiteware; no promotion to minors | Tapfiliate signup | Tapfiliate | Platform listing | 1.2 | https://tapfiliate.com/offers/voicegf-affiliate-program/ |
| 25 | Reez | direct | 30% | Capped: up to 60 days | 60 days | not found | not found | not found | not found | Tapfiliate signup | Tapfiliate | Third-party (platform blog) | 1.2 | https://tapfiliate.com/blog/best-ai-companion-affiliate-programs-cck/ |
| 27 | CraveU AI | direct | Not published | not found | not found | not found | not found | not found | not found | Via official affiliate page / Discord | not found | Third-party | 0.6 | https://zplatform-ai.pages.dev/ai-affiliate-programs/craveu-ai/ |
| 26 | HeraHaven | direct | Conflicting | Appears one-time ('pays once per referral') | not found | not found | not found | not found | not found | Affiliate link within 24h of account creation | not found | Third-party (conflicting) | 0.5 | https://zplatform-ai.pages.dev/ai-affiliate-programs/herahaven/ |
| 28 | Seduced AI | direct | Up to 40% depending on volume | not found | not found | not found | Cash or credits | not found | not found | not found | not found | Third-party | n/a (hold) | https://affmaven.com/ai-dating-affiliate-programs/ |
| 29 | Promptchan AI | direct | 60% of first payment, then 50% of next four payments | Capped: 5 payments | not found | not found | Wise, bank transfer, crypto; monthly | not found | not found | not found | Aiffiliate.io | Official | n/a (hold) | https://promptchan.com/articles/ai-porn-affiliate-program |
| 30 | SpicyGen | direct | 60% for first 30 days, then 30% lifetime; Gold 40% / Premium 50% by AM review | Lifetime | Signup within 30 days of click | $50 | Bank transfer, PayPal, USDT; NET-15 | Worldwide, 18+ | No brand bidding; no spam/bots/incentivized clicks; no misleading claims; one account; no real-person likeness or minor-suggestive content | No application; instant | Tapfiliate | Official | n/a (hold) | https://www.spicygen.ai/affiliate |

## 4. Flagged apps (content-policy hard rules, 07-LEGAL-COMPLIANCE §2)

**Do not list:**

| App | Rule | Reason | Source |
|---|---|---|---|
| Muah.ai | 1 (minors) | A breach in October 2024 exposed prompts that describe child sexual abuse. 404 Media reported a Discord moderator telling users who raised an underage character to take it to DMs. The platform says it does not actively filter content. | https://404media.co/hacked-ai-girlfriend-data-shows-prompts-describing-child-sexual-abuse-2 ; https://www.malwarebytes.com/blog/news/2024/10/ai-girlfriend-site-breached-user-fantasies-stolen |
| Botify AI (Ex-Human) | 1 (minors) + 2 (real people) | It hosted sexually charged bots of real actors portrayed as under 18, some featured on its homepage. A few were removed after press questions, but others stayed up. | https://www.technologyreview.com/2025/02/27/1112616/an-ai-companion-site-is-hosting-sexually-charged-conversations-with-underage-celebrity-bots |

**Hold (not recommended; out of companion scope and a risk under rule 2):**
- **SpicyGen:** turns a single uploaded image into adult video. Its own terms ban real-person likeness, but the feature itself carries deepfake risk.
- **Promptchan:** "animate any image".
- **Seduced AI:** an explicit image generator.

Do not list these unless the owner decides to cover image generators and a manual audit confirms there is no face upload or real-person feature.

**Audit before listing (user-generated character galleries):** CrushOn.AI, SpicyChat, Chub AI, JanitorAI and Character.AI.
- Graphika's "Character Flaws" report (2025-03-05, https://graphika.com/reports/character-flaws) names these as persona-bot platforms. The report's subject is harmful bots, including sexualized-minor personas.
- The report does not attribute minor-coded bots to any one platform, so this is not a finding against these apps.
- Run the listing checklist and store screenshots before publishing.
- The same check applies to Flipped.chat and CraveU, which also host user-generated characters.

**Network offers:** check every CrakRevenue offer one by one. Do not accept "undress", nudify or face-swap offers, or any offer whose creatives are minor-coded.

## 5. Apply to these first (owner applies; agent did not)

The order weighs expected value, official confirmation and fit with the SFW-first surface.

1. **Candy AI (direct, Everflow track):** up to 40% lifetime or CPA up to $70, 90-day cookie, official terms. Minimum payout is $250, or $100 on the FirstPromoter track. Ask which track suits an SEO directory.
2. **OurDream.ai (direct, Everflow):** up to 40% lifetime or CPA $26–$70, 180-day last-touch window, $100 minimum payout.
3. **CrakRevenue (network):** one payout covering many offers, plus a 5% lifetime sub-affiliate referral. Once in, request the AI companion offers: FantasyGF, Joi AI, SugarLab and Xtease. Their terms are third-party only, so verify them inside the dashboard.
4. **Nomi AI (direct, Rewardful):** 30% lifetime and the strongest SFW-leaning brand. Minimum payout $100. Brand-keyword bidding needs written consent.
5. **Kupid AI (direct):** 45% lifetime on the official page, unlimited first-touch cookie. Get the rate in writing because third-party sites say 30% or 40%.
6. **FantasyGF (direct webmaster form, or via CrakRevenue):** "up to 50% lifetime" headline. Cash terms are not published, so ask for them.
7. **Flipped.chat (direct form):** up to 30% lifetime on the official form. Audit its character gallery first.
8. **GirlfriendGPT (Tapfiliate):** 40% for 12 months, 30-day cookie, $100 minimum payout, PayPal.
9. **Secrets AI (direct, Everflow):** strict terms that match our rules well. Revenue share is capped at 6 months, so prefer CPA. Its terms forbid publishing its rates.
10. **DreamGF (direct, traceo.io):** an established brand, but the rate is not disclosed. Ask before investing in content.

Second wave, after first terms are confirmed: Joi AI, SugarLab and Nemora (high reported rates, third-party sources only), CherryPop (US and Europe only), and VoiceGF (only voice-companion program found).

## 6. Method and caveats

- **Process:** WebSearch and WebFetch on 2026-10-29. Official affiliate pages and terms were preferred. Third-party review sites were used only when no official page could be read, and are labeled as such. Some official pages failed to load and their terms were not found: SugarLab, Joi, GoLove, DarLink, Swipey, aiAllure and Lovescape.
- **EV score = R × B × C.** It is a ranking aid, not a revenue forecast.
  - R (rate points) = lifetime revshare % ÷ 10. Halve it if the revshare is capped. Use 1.5 for one-time or first-payment-only. Use 1 if the rate is unknown.
  - B (brand strength): H = 3, M = 2, L = 1. This is editorial judgement, based on how prominent the brand is across the sources reviewed. It is not traffic data.
  - C (confidence): official = 1.0, official-partial or platform listing = 0.8, third-party = 0.6, third-party with conflicting figures = 0.5.
  - Programs on hold are not scored.
- **Caveats:**
  1. Most third-party sources are affiliate marketers who earn from the links they publish. Their numbers often conflict (for example Kupid at 30%, 40% or 45%, and Secrets AI described as lifetime when official terms cap it at 6 months). Confirm terms in writing before building content around a program.
  2. Rates marked "up to" depend on tier, geo or volume. A new site will start at the base rate.
  3. Network terms (CrakRevenue) are only visible once logged in. The minimum payout and payment methods shown are third-party.
  4. Brand-bidding bans are near-universal. Do not run paid search on app names.
  5. Secrets AI's terms forbid public disclosure of commission rates. Check every program's terms before publishing rates on the site.
  6. Terms change often. Store each program's terms and the date checked in the DB (07 §6) and re-verify before applying.
  7. The policy flags rest on public reporting from 2024–2025. Every listed app still needs the §2 listing checklist with dated screenshots.
