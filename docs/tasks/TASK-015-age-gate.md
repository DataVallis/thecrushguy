# TASK-015 — Age gate (pluggable)

- Read: `02-ARCHITECTURE.md` (Age gate), `07-LEGAL-COMPLIANCE.md` §3

Self-declaration provider now; interface ready for third-party age verification and geo rules. Only NSFW sections gated; SFW pages ungated; no cloaking. Tests: gated route without cookie shows gate; with cookie shows content; SFW route never gated.
