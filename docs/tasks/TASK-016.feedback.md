# TASK-016 feedback — data-based reviews + review queue
Status: DONE (owner gallery check pending)

## What changed
- ADR-030: publish with ratings computed from sourced public facts; conversation not scored; honest label; no Review JSON-LD; gallery check stays human.
- Code: `src/lib/review/data-review.ts` (formula), `src/lib/admin/facts-import.ts` (bundle import), `reviewQueue` + `publishAfterGalleryCheck` in repo, `/admin/research` page, public app page label/sources/"Not tested", /how-we-rank formula, /about text no longer claims we tested every app. Migration 0005.
- Research: facts for 36 candidate apps (`docs/research/raw/facts/`), bundled in `src/data/research-bundle.json`; 5 held for conflicts (PolyBuzz "Teen Mode", Moemate no 18+, Dream AI 12+ on Google Play, Voxta no 18+ terms, Janitor AI allows celebrity characters). Targeted deepfake-feature checks in `raw/facts/deepfake-*.json`.

## State after import (local test DB)
15 apps are ready for the gallery check (Nomi, Kindroid, Erogen, AI Angels, FantasyGF, My Dream Companion, Flipped.chat, Fantasy.ai, Luvr, OurDream, TenderTalk, Romantic AI, Blush, DreamGF, EVA AI) (all facts incl. a sourced monthly price). Others miss a price with a known billing period, a free-plan answer or 18+ terms — candy.ai, GirlfriendGPT, Kupid, Secrets AI, GoLove, Nastia, HeraHaven pages hide prices from crawlers: add the price in admin with its source after a look in the browser.

## Owner checks on dev
1. `/admin/research` → Import research bundle → note counts.
2. For each ready app: Open site → look at gallery/marketing → Gallery OK — publish (or Reject with reason).
3. Open a published app page: lavender "Rated from public information" box, Conversation "Not tested", Sources list at the bottom.

## Tests
`data-review.test.ts` (formula, unsourced facts ignored, unknown billing ignored, never sets gallery check), `facts-import.test.ts` (bundle imports, idempotent, hands-on untouched, queue publish/refuse), JSON-LD without Review for data reviews.
