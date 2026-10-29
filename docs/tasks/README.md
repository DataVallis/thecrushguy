# Tasks

Latest TASK number in use: **TASK-015** (next free: TASK-016). Latest ADR: **ADR-024** (next free: ADR-025).

| Task | Title | Depends on | Status |
|---|---|---|---|
| TASK-001 | Brand naming | — | DONE → The Crush Guy (ADR-008) |
| TASK-002 | Logo | 001 | DONE (concept A, refinements open) → `design/logo/` (ADR-009) |
| TASK-003 | CGP + tokens | 002 | In progress — typography decided (ADR-023), palette/tokens open |
| TASK-004 | Affiliate program research | — | DONE → `docs/research/AFFILIATE-PROGRAMS.md` |
| TASK-005 | Keyword & competitor research | — | Planned |
| TASK-006 | App universe (150 apps + compliance) | 004 | Planned |
| TASK-010 | Scaffold + deploy skeleton | — | DONE — Live on dev 2026-10-29 |
| TASK-010b | Kamal deploy on shared host (ADR-019/021) | 010 | DONE — PR #1, Live on dev (run 40899557896) |
| TASK-011a | Data model + migrations + publish guard | 010b | DONE — PR #2, Live on dev (migrated at start) |
| TASK-011b | Magic-link admin auth (ADR-017/018/022) | 011a | DONE — PR #4, Live on dev (deploy + smoke check green) |
| TASK-011c | Apps/categories admin, publish flow, audit | 011b | DONE — PR #6, Live on dev |
| TASK-011d | Pricing, sources, affiliate links, CSV import | 011c | DONE — PR #7, Live on dev |
| TASK-012 | Public pages v1 | 003, 011 | Planned |
| TASK-013 | `/go/` redirect + click tracking | 011 | Built — PR pending |
| TASK-014 | SEO foundation (incl. ADR-016 i18n quality bar) | 012 | Planned |
| TASK-015 | Age gate (launch-blocking, ADR-006) | 010 | Planned |
