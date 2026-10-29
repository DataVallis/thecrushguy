# APPS-FACTS research brief (TASK-016) — instructions for research agents

Goal: verifiable facts per app for The Crush Guy's **data-based ratings** (ADR-030). Scores are computed by code from these
facts, so every fact must be real and sourced. Public, SFW sources only.

## Hard rules
- **Never invent or infer.** Each fact = `{"v": <value>, "src": "<URL you opened in this run>"}`. If a page does not say it clearly, use `{"v": "unknown", "src": ""}`. "Not mentioned" is `unknown`, not `no` — use `no` only when a page explicitly says the feature/right does not exist.
- Open only: logged-out homepage, pricing/subscription page, FAQ/help center, Terms, Privacy Policy, About/Imprint, official App Store / Google Play listing. Never open character galleries, explore/discover pages, NSFW image pages or adult media. If a homepage is explicit, leave it and use terms/privacy/store pages.
- Prices: lowest paid plan **per month** as shown (if only annual, monthly = annual/12 and set `billing` to "annual"); currency ISO-3. Store in-app purchase lists count as a source.
- Quotes: for privacy and terms facts add a short verbatim quote (≤ 25 words) in `q` so a human can verify fast.
- `checked_at` = 2026-10-29.

## Output: one JSON object per app
```json
{
  "slug": "candy-ai",
  "checked_at": "2026-10-29",
  "pricing": {
    "has_free_plan": {"v": "yes|no|unknown", "src": ""},
    "free_plan_limits": {"v": "short text or unknown", "src": ""},
    "starting_price_monthly": {"v": 12.99, "src": ""},
    "currency": "USD",
    "billing": "monthly|annual|unknown",
    "uses_tokens_or_credits": {"v": "yes|no|unknown", "src": ""}
  },
  "features": {
    "long_term_memory": {"v": "yes|no|unknown", "src": ""},
    "voice_messages": {"v": "yes|no|unknown", "src": ""},
    "voice_calls": {"v": "yes|no|unknown", "src": ""},
    "image_generation": {"v": "yes|no|unknown", "src": ""},
    "custom_character_creation": {"v": "yes|no|unknown", "src": ""},
    "group_chat": {"v": "yes|no|unknown", "src": ""},
    "nsfw_allowed": {"v": "yes|no|unknown", "src": ""}
  },
  "platforms": {"v": ["web", "ios", "android"], "src": ""},
  "privacy": {
    "privacy_policy_url": "",
    "account_data_deletion": {"v": "yes|no|unknown", "src": "", "q": ""},
    "sells_or_shares_for_ads": {"v": "yes|no|unknown", "src": "", "q": ""},
    "chats_used_for_training": {"v": "yes|no|opt-out|unknown", "src": "", "q": ""},
    "retention_period_stated": {"v": "yes|no|unknown", "src": "", "q": ""}
  },
  "terms": {
    "min_age_18": {"v": "yes|no|unknown", "src": "", "q": ""},
    "bans_minor_content": {"v": "yes|no|unknown", "src": "", "q": ""},
    "refund_policy_stated": {"v": "yes|no|unknown", "src": "", "q": ""},
    "age_verification": {"v": "self-declaration|id-or-face|none|unknown", "src": ""}
  },
  "operator": {
    "name": {"v": "", "src": ""},
    "country": {"v": "ISO-2 or unknown", "src": ""},
    "address_stated": {"v": "yes|no", "src": ""}
  },
  "notes": "anything a human must double-check"
}
```
Write the JSON array with the Write tool to the file you are given, then reply with a 5-line summary only.
