# Tasks

Latest TASK number in use: **TASK-015** (next free: TASK-016). Latest ADR: **ADR-021** (next free: ADR-022).

| Task | Title | Depends on | Status |
|---|---|---|---|
| TASK-001 | Brand naming | — | DONE → The Crush Guy (ADR-008) |
| TASK-002 | Logo | 001 | DONE (concept A, refinements open) → `design/logo/` (ADR-009) |
| TASK-003 | CGP + tokens | 002 | Planned |
| TASK-004 | Affiliate program research | — | DONE → `docs/research/AFFILIATE-PROGRAMS.md` |
| TASK-005 | Keyword & competitor research | — | Planned |
| TASK-006 | App universe (150 apps + compliance) | 004 | Planned |
| TASK-010 | Scaffold + deploy skeleton | — | PARTIAL — Built, pushed to `dev`; CI blocked by org billing; dev deploy pending (`TASK-010.feedback.md`) |
| TASK-010b | Kamal deploy on shared host (ADR-019/021) | 010 | Merged to `dev` (PR #1); first deploy pending owner steps |
| TASK-011a | Data model + migrations + publish guard | 010b | DONE — PR to `dev` (`TASK-011a.feedback.md`) |
| TASK-011b | Magic-link admin auth (ADR-017/018) | 011a | Planned |
| TASK-011c | Apps/categories admin, publish flow, audit | 011b | Planned |
| TASK-011d | Pricing, sources, affiliate links, CSV import | 011c | Planned |
| TASK-012 | Public pages v1 | 003, 011 | Planned |
| TASK-013 | `/go/` redirect + click tracking | 011 | Planned |
| TASK-014 | SEO foundation (incl. ADR-016 i18n quality bar) | 012 | Planned |
| TASK-015 | Age gate (launch-blocking, ADR-006) | 010 | Planned |
