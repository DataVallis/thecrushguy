# TASK-020 feedback — owner can finish pending apps in admin
Status: DONE
- A sourced monthly/yearly plan added in admin now feeds the data-review formula (value score, price chip, pros/cons, verdict) right after saving the plan; the import keeps no extra price row next to it.
- Re-importing the research bundle never un-ticks checklist items the owner ticked, and keeps a manual free-plan answer when research has none.
- `/admin/research` explains how to fix each blocker.
Tests: `facts-import.test.ts` "owner additions".
