# TASK-013 — `/go/{slug}` redirect + click tracking

- Read: `02-ARCHITECTURE.md` (Outbound click tracking)

## Done when
Redirect < 50 ms p95 locally, click logged asynchronously with hashed IP, bots skipped, `noindex` + `no-store` headers, inactive link → redirect to app page (not 404), tests cover each case. No affiliate IDs in repo.
