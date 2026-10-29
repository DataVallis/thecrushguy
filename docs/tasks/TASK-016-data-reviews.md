# TASK-016 — Data-based reviews + review queue (ADR-030)

- Read: ADR-030, 07-LEGAL §2, 06-SEO-CONTENT, `docs/research/FACTS-BRIEF.md`

## Steps
1. Research sourced facts for candidate apps (FACTS-BRIEF) → `docs/research/raw/facts/`.
2. `computeDataReview`: deterministic scores/reasons/pros/cons/verdict from facts; publish the formula on /how-we-rank.
3. DB: `apps.review_method`, `apps.facts`, `apps.facts_checked_at`; quality gate allows empty conversation for data reviews.
4. Import: research bundle (seed CSV + facts) in one click; idempotent; never overwrites hands-on reviews; never sets the gallery check.
5. Admin `/admin/research`: import + review queue (ready first) with "Gallery OK — publish" and "Reject".
6. Public page: "rated from public information" label, "Not tested" conversation, sources list, no Review JSON-LD.

## Done when
Owner can import, check galleries and publish from one admin page; tests cover formula, import idempotency, queue publish/refuse.
