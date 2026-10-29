# TASK-011 — Data model + admin CRUD

- Blocked by: TASK-010 · Read: `01-PRODUCT-SPEC.md` §5–6, `07-LEGAL-COMPLIANCE.md` §2

## Scope
Migrations for the data model; admin under `/admin` protected (auth + 2FA or Cloudflare Access); CRUD for App, Category, PricingPlan, Source, AffiliateLink, Translation; listing checklist fields with publish blocked unless all checked; CSV import of `APPS-SEED.csv`; audit log.

## Tests
Authorization (anon can't reach admin), publish blocked when checklist incomplete, import idempotent.

## Decisions already made (2026-10-29, ADR-017/018/020)
- Split: 011a data model + migrations (+ `translations` table, editor deferred) · 011b magic-link auth · 011c apps/categories admin, publish guard, audit log · 011d pricing, sources, affiliate links, CSV import.
- Auth: magic link via SMTP `mail.datavallis.com` from hi@thecrushguy.com; allowlist `ADMIN_EMAILS` (GitHub variable).
- Migrations run at container start when `RUN_MIGRATIONS=1` (pattern from postaja).
- Dependencies approved by owner (2026-10-29): `nodemailer`, `zod`. Local/CI mail capture: Mailpit container.
