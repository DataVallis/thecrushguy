# 07 — LEGAL & COMPLIANCE

> Not legal advice. Items marked **[LAWYER]** must be confirmed by a lawyer/accountant before launch. Agents must not decide these; they implement what the owner confirms.

## 1. Entity & accounts

- Run the project through a separate entity (recommended new d.o.o. or at minimum separate s.p.), separate bank account, separate email domain. **[LAWYER/ACCOUNTANT]** taxation of foreign affiliate income, VAT (reverse charge), invoicing/self-billing with networks.
- Imprint (`/imprint`) with entity name, address, registration number as required by EU/SI law (E-Commerce Directive / ZEPT).

## 2. Content policy — HARD RULES (non-negotiable)

Agents: if anything could break these, STOP and ask the owner.

1. **Adults only.** We list only services that are for adults (18+). We **never list, link to, describe or show** any app, character, template, image or text that depicts, suggests or is marketed with minors or minor-coded characters (school settings with child characters, "teen", "loli", childlike bodies or behavior, etc.). An app that offers or tolerates such content is **not listed**, or is removed immediately with `removal_reason` logged.
2. **No real people without consent.** No apps whose main feature is creating companions/deepfakes of real, identifiable people without consent (celebrities, exes, coworkers). Not listed.
3. **No non-consensual or illegal content promotion.** We don't list apps that market non-consensual sexual content, violence fetish as a selling point, or anything illegal in the EU.
4. **No explicit media on our site.** We never host explicit images/video. Screenshots are our own and SFW (or blurred).
5. **No fake data.** No invented ratings, user counts, testimonials or reviews (EU Omnibus Directive / UCPD prohibit fake reviews). Our score is clearly our editorial score.
6. **Honest disclosure.** Affiliate relationships disclosed on every page and in `/affiliate-disclosure` (EU UCPD, FTC rules for US visitors). Sponsored slots labeled "Sponsored".
7. **Wellbeing.** Guides and reviews must not encourage isolation or present AI companions as replacements for human relationships or professional help. Include a short responsible-use note in `/how-we-rank` or a guide, with links to general support resources.

Listing checklist (stored in DB per app, all must be "yes" to publish):
- [ ] Service states 18+ only in its terms
- [ ] No minor-coded content found in public character galleries / marketing (checked date + screenshots stored internally)
- [ ] No deepfake-of-real-person feature as selling point
- [ ] Privacy policy exists and is linked
- [ ] Company/operator identifiable

## 3. Age gate & age verification

- Self-declaration age gate for NSFW-related sections (see `02-ARCHITECTURE`).
- **[LAWYER]** Check whether a directory that links to adult services is in scope of: UK Online Safety Act (Part 5 duties for pornographic content), US state age-verification laws (Texas, Utah, Louisiana, others), EU DSA / national laws (FR, DE JMStV), and Slovenian law. Decision options: (a) SFW-only in restricted regions via geo rules, (b) third-party age verification provider for NSFW sections, (c) geo-block NSFW sections.
- Gate must be implemented as a pluggable provider so (b) can be added without rework.

## 4. Privacy (GDPR)

- Privacy policy, data minimization: no raw IPs, no user accounts in v1, analytics cookieless if possible.
- Cookie banner only if non-essential cookies used (age-gate cookie is functional; still mention it).
- Data processing agreements with hosting/analytics providers.
- Affiliate redirects: networks set their own cookies on their domain — disclose in privacy policy.

## 5. Trademarks & content rights

- App names/logos used nominatively for review (generally allowed); don't imply partnership. Remove a logo on request.
- No copying vendor marketing text; our own descriptions.
- Our own screenshots; no scraping of vendor media.
- Don't register domains containing third-party trademarks.

## 6. Affiliate program terms

- Follow each program's rules (no brand bidding, no incentivized clicks, no misleading claims, allowed geos). Store terms + date in DB.

## 7. Platforms

- Ad networks, payment providers, hosting and social platforms each have adult-content policies — check before relying on any (ADR needed per platform).
