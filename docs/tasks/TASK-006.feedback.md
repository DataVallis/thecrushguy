# TASK-006 feedback — app universe
Status: PARTIAL — 125 apps (target 150+); top-50 ordering and gallery checks open

## What I did
6 parallel research runs with a strict brief (`docs/research/APPS-SEED-BRIEF.md`: public SFW pages only, no invented facts, exclusion rules from 07-LEGAL §2). Raw JSON in `docs/research/raw/`, merged by `scripts/merge-app-research.py` into `docs/research/APPS-SEED.csv` + summary `APPS-SEED.md`. Importer extended: research `status` column → only candidates imported.

## Results
- 125 unique apps (150 raw rows, duplicates merged, strictest status wins): 43 candidate · 60 hold · 22 excluded. Every row has a source URL + date (checked by the merge script).
- Exclusions include Character.AI, Chub AI, CrushOn, Muah, Botify, zeta, Secret Desires, Grok companions, Meta AI Studio, Snapchat My AI (child-safety reports), CherryPop ("Teen (18+)" category), xMode/SoulGen/AIBoy (face-swap/celebrity), and pure image generators.
- Adults-only rule enforced in the merge: terms that admit minors → hold (Tolan, Linky AI, Couple.me).

## Deviations / gaps
- 125 < 150 rows. Checklist for "top 50" not complete: needs TASK-005 keyword data and a human gallery check (agents must not open explicit galleries).
- Facts were gathered by research agents; spot checks only. Treat every candidate as unverified until the hands-on review.

## Tests
`src/lib/admin/apps-seed.test.ts` imports the real CSV into a fresh DB: 0 errors, candidates created as drafts, others skipped. Listing tests cover the status skip (incl. invalid hold rows).
