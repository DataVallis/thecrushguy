# 05 — BRAND (name, logo, CGP)

Status: **name decided — The Crush Guy, thecrushguy.com (ADR-008)**. Logo and CGP in progress.

## Positioning

- **What we are:** the honest, independent guide to AI companion apps. We test, compare and rank.
- **Personality:** smart, warm, a bit playful, trustworthy. Not sleazy, not clinical.
- **Tone of voice:** direct, plain language, short sentences, humor allowed, never explicit on public pages. "We tried it so you don't have to."
- **Must feel safe to open on a phone in public** (SFW-first, ADR-003).

## 1. Naming (TASK-001)

### Criteria (score each candidate 1–5)

1. Short: ideally ≤ 10 letters, max 2 syllables-ish, easy to spell after hearing it.
2. Works in English and doesn't mean something bad in DE, FR, ES, IT, PT, PL, NL, SL, JA (romanized), KO (romanized).
3. Domain available: **.com strongly preferred**; acceptable fallbacks: .ai, .co, .app, .io (note: .ai is costly per year). Check also typos/plurals.
4. Hints at companionship/AI/guidance without being generic ("bestaigirlfriend.com" style exact-match is a fallback, not the goal — brandable wins long-term).
5. Not confusable with existing app or trademark (search EUIPO, USPTO, WIPO Global Brand DB, app stores).
6. Handles available on X, Instagram, TikTok, Reddit, YouTube, Telegram (or close variants).
7. SFW: no explicit words in the name.
8. Can extend later (newsletter, own app) without renaming.

### Naming directions to explore

- Guide/scout metaphors (someone who tests and recommends)
- Heart/connection + tech blends
- Invented brandable words (2 syllables, vowel-rich)
- Short compound words

### Deliverable

`docs/research/NAMING.md` with: 40+ raw candidates → shortlist of 10 with scores per criterion, domain availability + price (checked date), trademark quick check results (with links), social handle check → top 3 recommendation with rationale. **Owner picks.** Agent must not buy domains.

## 2. Logo (TASK-002)

Requirements:
- Wordmark + symbol (icon) that works alone at 16×16 (favicon) and 512×512 (app icon / social avatar).
- Works in light and dark, single color and full color.
- Simple geometric construction; no faces/bodies/suggestive shapes.
- Deliver as SVG (master), PNG exports (16, 32, 48, 180, 192, 512, 1024), favicon.ico, `apple-touch-icon`, OG default image 1200×630.
- 3 concepts → owner picks 1 → 2 refinement rounds.

Process option: AI image generation for exploration, then **clean vector redraw** (SVG by hand/code or in Figma). Final logo must be original vector, not a raster AI output.

## 3. CGP — corporate design guidelines (TASK-003)

Deliverable `design/CGP.md` + `design/tokens.json` + a one-page visual board (HTML or Figma):

1. **Logo usage**: versions, clear space, min size, don'ts.
2. **Color palette**: primary, secondary, accent, neutrals (9-step scales), semantic (success/warning/error/info), dark mode mapping. All text pairs WCAG AA contrast-checked.
3. **Typography**: 1 display + 1 text font (Google Fonts or free license, variable font preferred, good Latin-Ext, Cyrillic, Greek coverage; CJK fallback stack), type scale, line heights.
4. **Spacing & layout**: 4px base grid, container widths, breakpoints.
5. **Components look**: buttons (primary CTA style is critical — "Visit {App}"), cards (app card), score badge, tags/chips, tables (comparison), rating bars, age gate modal, "Sponsored" label.
6. **Iconography**: one icon set (e.g. Lucide/Phosphor), stroke width.
7. **Imagery rules**: own app screenshots in device frames; abstract/illustrative hero visuals; no stock photos of people in suggestive contexts; no real persons.
8. **Voice & tone**: do/don't examples, microcopy (CTA, empty states, disclosures).
9. **Social templates**: avatar, X/Reddit banner, post template (comparison card, "app of the week").

`tokens.json` must be consumable by Tailwind config (colors, fonts, radii, shadows, spacing).

## Persona — The Crush Guy (draft 2026-10-29, owner to confirm)

- Story line: "I tried every AI crush, so you don't have to."
- Who: a friend who paid the subscriptions, chatted for weeks and wrote it all down. Plain, funny, honest about prices and dark patterns. Never vulgar.
- Look: NOT a real person and not a human face — the persona is the logo mascot (concepts: A cool heart with sunglasses, B chat bubble + heart + check, C heart-shaped magnifier). Can get poses (thumbs up, yawn, raised brow).
- Never: explicit content on public pages, invented ratings/facts, "AI is better than real people" framing. Guide and critic, not salesman.
- Working palette for concepts: ink #1B1530, coral #FF4D6D, blush #FFE4EA, lavender #F3F0FA. Type: Bricolage Grotesque (display) + Inter (text). Not final until TASK-003.
