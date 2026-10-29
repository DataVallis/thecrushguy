# Tasks

Latest TASK number in use: **TASK-022** (next free: TASK-023). Latest ADR: **ADR-034** (next free: ADR-035).

| Task | Title | Depends on | Status |
|---|---|---|---|
| TASK-001 | Brand naming | — | DONE → The Crush Guy (ADR-008) |
| TASK-002 | Logo | 001 | DONE (concept A, refinements open) → `design/logo/` (ADR-009) |
| TASK-003 | CGP + tokens | 002 | DONE — PR #14, Live on dev (`design/CGP.md`, ADR-029) |
| TASK-004 | Affiliate program research | — | DONE → `docs/research/AFFILIATE-PROGRAMS.md` |
| TASK-005 | Keyword & competitor research | — | PARTIAL — universe + competitors + v1 sitemap proposal (`docs/research/KEYWORDS.md`); volumes wait for Keyword Planner |
| TASK-006 | App universe (150 apps + compliance) | 004 | PARTIAL — 125 apps (43 candidate / 60 hold / 22 excluded), `docs/research/APPS-SEED.md`; top-50 + gallery checks open |
| TASK-010 | Scaffold + deploy skeleton | — | DONE — Live on dev 2026-10-29 |
| TASK-010b | Kamal deploy on shared host (ADR-019/021) | 010 | DONE — PR #1, Live on dev (run 40899557896) |
| TASK-011a | Data model + migrations + publish guard | 010b | DONE — PR #2, Live on dev (migrated at start) |
| TASK-011b | Magic-link admin auth (ADR-017/018/022) | 011a | DONE — PR #4, Live on dev (deploy + smoke check green) |
| TASK-011c | Apps/categories admin, publish flow, audit | 011b | DONE — PR #6, Live on dev |
| TASK-011d | Pricing, sources, affiliate links, CSV import | 011c | DONE — PR #7, Live on dev |
| TASK-012 | Public pages v1 | 003, 011 | DONE — PR #11, Live on dev; Lighthouse/CWV open |
| TASK-013 | `/go/` redirect + click tracking | 011 | DONE — PR #8, Live on dev |
| TASK-014 | SEO foundation (incl. ADR-016 i18n quality bar) | 012 | DONE — PR #13, Live on dev; Rich Results Test on prod open |
| TASK-015 | Age gate (launch-blocking, ADR-006) | 010 | DONE — PR #9, Live on dev; default region list kept (ADR-027) |
| TASK-016 | Data-based reviews + review queue (ADR-030) | 006, 012 | DONE — `/admin/research`; 36 apps researched, owner gallery check pending |
| TASK-017 | GEO — AI search optimisation (ADR-031) | 014 | DONE — robots AI groups, /llms.txt, quick answers, IndexNow |
| TASK-018 | Home & app page UX v2 (ADR-032) | 012 | DONE — filters, flags, top pick, sticky CTA, /go → official site |
| TASK-019 | Visuals: mascot illustrations + app covers | 018 | DONE — illustrated filters, hero art, covers, app banner |
| TASK-020 | Owner completes pending apps (manual price feeds formula) | 016 | DONE |
| TASK-021 | MCP endpoint for the research agent (ADR-033) | 016 | DONE — owner sets MCP_TOKEN + connector |
| TASK-022 | Google Analytics 4 with consent (ADR-034) | — | DONE — prod only |
