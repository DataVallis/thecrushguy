# TASK-011 — Data model + admin CRUD

- Blocked by: TASK-010 · Read: `01-PRODUCT-SPEC.md` §5–6, `07-LEGAL-COMPLIANCE.md` §2

## Scope
Migrations for the data model; admin under `/admin` protected (auth + 2FA or Cloudflare Access); CRUD for App, Category, PricingPlan, Source, AffiliateLink, Translation; listing checklist fields with publish blocked unless all checked; CSV import of `APPS-SEED.csv`; audit log.

## Tests
Authorization (anon can't reach admin), publish blocked when checklist incomplete, import idempotent.
