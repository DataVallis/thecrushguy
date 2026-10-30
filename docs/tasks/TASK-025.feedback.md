# TASK-025 feedback — affiliate outreach tracker
Status: DONE
- New table `affiliate_outreach` (migration 0006): program, app (optional — networks cover many), signup URL, contact, status (to_apply / to_contact / applied / approved / rejected / no_program), applied + follow-up dates, research terms, notes. Audited writes. No affiliate URLs here (they stay encrypted in affiliate_links).
- `/admin/affiliates`: grouped lists — follow up now, to apply, to contact, waiting, approved (shows whether the link is active), closed; one-click "Applied / sent today", "Approved", "Rejected"; edit form; warning for published apps with nothing in progress; "Load researched programs" (25 programs/apps from `src/data/affiliate-programs.json`).
- Applying sets a follow-up 7 days later.
- MCP: `list_outreach`, `update_outreach`, `seed_outreach` so the agent can log what the owner reports.
Tests: `outreach.test.ts`.
