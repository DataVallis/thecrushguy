# 04 — BUSINESS MODEL

## Pattern we copy

Researched reference: a Maribor-based founder runs a portfolio of high-traffic sites (claims 90M visitors/month) through a 3–4 person company with ~€3M revenue and ~50% EBITDA margin. Pattern: own sites + SEO → huge organic traffic → monetize via affiliate/ads/own products → reinvest profit into stable assets. We apply the pattern to one focused niche.

## Revenue streams (in order of priority)

1. **Affiliate revenue share (core)** — lifetime % of what referred users spend.
2. **Affiliate CPA/PPS** — one-off payout per signup/paying user; use where revshare is not offered or for cash-flow early on.
3. **Direct sponsored slots (Phase 3)** — app vendors pay a fixed monthly fee for a labeled "Sponsored" position, "featured new app" or newsletter mention. Typical in directory businesses once traffic is proven.
4. **Display ads (optional, low priority)** — mainstream ad networks usually don't accept adult-adjacent sites; adult ad networks pay low and hurt UX. Only test if data says so.
5. **Own product (Phase 4, separate decision)** — own companion app or persona, fed by directory traffic.

## Affiliate programs — seed list

> Verified 2026-10-29 in TASK-004 → see `docs/research/AFFILIATE-PROGRAMS.md` (30 programs). Corrections: CrakRevenue official AI Companion revshare shows 30% (50% only third-party); OurDream CPA $26–70 (not $50); Candy AI official: up to 40% lifetime + CPA up to $70, 90-day cookie. Many "lifetime" deals are capped (e.g. Secrets AI 6 months, GirlfriendGPT 12 months).

### Original seed (historical)

Numbers below come from third-party affiliate review sites (Oct 2026), not from the programs themselves. Treat as hypotheses.

| Program | Reported terms | Via |
|---|---|---|
| CrakRevenue (network) | AI companion offers up to 50% lifetime revshare; also CPA/PPS; 5% lifetime sub-affiliate referral; $60M+ paid yearly | Network |
| Candy AI | ~40% lifetime revshare | CrakRevenue / direct |
| FantasyGF | up to 50% lifetime revshare | CrakRevenue |
| OurDream.ai | 40% lifetime revshare or up to $50 CPA | In-house (Everflow) |
| Others to research | Character-style apps, Replika-like apps, voice companions, Telegram/Discord companion bots | TASK-004 |

Rules:
- Prefer **direct programs** when terms are equal or better (no network cut), networks for breadth and single payout.
- Record for each program: model, % / amount, cookie window, lifetime or capped, payout threshold, payout methods, geo restrictions, traffic restrictions (e.g. no brand bidding), approval requirements, source URL + date.
- Mainstream companion apps (SFW) may have programs on standard SaaS networks (Impact, PartnerStack, Rewardful, FirstPromoter) — include them.

## Unit economics (illustrative model, replace with real data)

```
Sessions/month                         S
Outbound CTR (clicks / sessions)       c   (directories: assume 15–30% to start)
Signup rate on vendor side             s   (assume 5–15%)
Paid conversion of signups             p   (assume 5–15%)
Avg monthly spend of paying user       m   (assume $10–25)
Revshare                               r   (assume 40%)
Avg paying lifetime (months)           L   (assume 3–6)

New paying users/month   = S × c × s × p
Lifetime value per payer = m × r × L
Monthly revenue (steady state, approx.) ≈ new payers/month × m × r × L
```

Example only (all assumptions): S=100k, c=20%, s=10%, p=10% → 200 new payers/month; m=$15, r=40%, L=4 → $24 LTV → ~**$4.8k/month** at steady state. Each lever matters; CTR and choice of programs are the ones we control most.

Track real numbers in admin from month 2 and replace these assumptions.

## Costs

- Domain (standard €10–50/yr; premium could be €1k+), Hetzner VPS (€10–40/mo), Cloudflare (free/pro), analytics self-hosted, LLM API for translation/drafting (est. €20–100/mo), owner time.
- Optional: freelance editor/translator review for top languages.

## Payout & banking notes

- Adult-adjacent affiliate networks pay via wire, Paxum, crypto, sometimes PayPal. Use a business account that accepts these; tell the bank about the business model up front.
- Invoices/self-billing from networks go to the project entity; keep clean bookkeeping (foreign income, VAT reverse charge where applicable — confirm with accountant).

## Key risks

| Risk | Mitigation |
|---|---|
| Google update cuts traffic | Strong E-E-A-T (real testing, methodology), diversify (Reddit, X, newsletter, direct traffic) |
| AI answers reduce clicks | Unique data (prices, tests, screenshots) that AI cites; brand building |
| Programs change/cancel revshare | Diversify across 10+ programs; prefer contracts with written terms; log terms history |
| Apps die quickly | Verification queue, status `paused/removed`, redirect removed apps to alternatives |
| Payment/banking friction | Separate entity, clear documentation, compliant content |
| Regulation (age verification) | Pluggable age-gate, SFW-first surface, legal review |
