# APPS-SEED research brief (TASK-006) — instructions for research agents

Goal: factual seed data for AI companion apps for The Crush Guy, an independent review directory. Public, SFW sources only.

## Hard rules (non-negotiable, 07-LEGAL-COMPLIANCE §2)
- **Never invent a fact.** Every value you fill must come from a page you actually opened in this run. If you can't confirm it, write `unknown` (or leave empty).
- Do **not** open explicit galleries, character catalogues, NSFW image pages or adult media. Use only: the homepage (as served to a logged-out visitor), Terms of Service, Privacy Policy, About/Imprint/Contact pages, pricing pages, official app-store listings (Apple App Store / Google Play), and reputable press or research articles. If a homepage itself is explicit, stop there and rely on terms/privacy/app-store pages.
- Write the `tagline` in your own words, neutral and SFW, max 120 characters, describing what the product is (no marketing copy, no explicit words).
- **Exclude** (status `excluded`, reason + source URL) any app that: markets or tolerates minor-coded/"teen"/school-age characters or content; offers deepfakes / "nudify" / undressing / face-swap of real people as a feature; markets non-consensual content; or is primarily an explicit image/video generator rather than a companion/chat app (reason "not a companion app"). Also exclude apps with credible public reports of child-safety failures (cite the report).
- Status `hold` = exists but key facts missing (e.g. no reachable website, no operator) — say why.
- Status `candidate` = everything else.

## Fields (one JSON object per app)
```
slug                  lowercase-kebab of the brand, e.g. "candy-ai"
name                  official product name
website_url           official homepage (https)
tagline               your own SFW one-liner (≤120 chars)
platforms             subset of web;ios;android;desktop;telegram;discord — only what you confirmed
company_name          operator as named in terms/privacy/app store (legal entity if given)
company_country       ISO-2 of the operator's stated address/jurisdiction, else empty
privacy_policy_url    URL of the privacy policy you opened, else empty
nsfw_allowed          yes / no / unknown — from terms, FAQ or app-store content rating (state which)
has_free_plan         yes / no / unknown — only from the pricing page/app store
starting_price        lowest paid plan per month in major units, e.g. 9.99 (empty if not confirmed)
currency              ISO-3 of that price
chk_18plus_terms      yes / no / unknown — do the terms state users must be 18+ (or the age of majority)?
chk_privacy_policy    yes / no — privacy policy exists and opens
chk_operator_identifiable  yes / no — a legal entity or person with an address/jurisdiction is named
chk_no_deepfake_feature    yes / no / unknown — "no" if it advertises creating companions/images of real, identifiable people
affiliate_program     id from docs/research/affiliate-programs.csv if the app is listed there, else empty
status                candidate / excluded / hold
exclusion_reason      required for excluded/hold
source_url            the single most important page used (homepage or terms)
source_field          what that source supports, e.g. "listing basics" or "terms (18+, operator)"
extra_sources         other URLs you used, separated by " ; " (privacy, pricing, app store, press)
checked_at            2026-10-29
notes                 anything a human must double-check (e.g. "gallery not inspected — manual check needed")
```
Never mark "no minor-coded content" as checked — that needs a human look at the gallery; note it if relevant.

## Output
Return ONLY a JSON array of objects with exactly these keys (no prose before/after). Aim for the number of apps you were asked for; quality over quantity — fewer rows with real sources beat many guessed ones.
