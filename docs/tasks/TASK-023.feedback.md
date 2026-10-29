# TASK-023 feedback — fact-driven categories
Status: DONE
- `src/lib/catalog/auto-categories.ts`: 9 categories managed by code from app facts — all apps, free, cheap (≤ $10/€10 regular monthly), voice, pictures, memory, iPhone, Android, adults-only (gated, noindex). Names are full page titles ("Best free AI companion apps").
- Synced after every facts import / recompute (admin price edits, MCP) and every admin app save; MCP tool `sync_categories`. Hand-made categories are never touched.
- Girlfriend / boyfriend / roleplay lists need an "audience" fact first (next step for the research agent).
Tests: `auto-categories.test.ts`.
