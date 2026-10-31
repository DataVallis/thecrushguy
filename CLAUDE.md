# Agent entry point

Before ANY task, read in this order:

1. `docs/DEVELOPMENT-RULES.md` (owner's standard rules — roles, modes, git, testing, security)
2. `docs/HANDOFF.md` (current state + working mode A/B)
3. `docs/00-MANIFEST.md`
4. `docs/03-DECISIONS.md` (ADRs override DEVELOPMENT-RULES; newest wins)
5. Your assigned `docs/tasks/TASK-XXX-*.md`

Hard rules specific to this project (never override):

- `docs/07-LEGAL-COMPLIANCE.md` → section "Content policy — hard rules" is non-negotiable. If a listing, image, text or feature could violate it, STOP and ask the owner.
- Never invent affiliate terms, prices, ratings or user counts. Every factual claim about a listed app needs a source URL + date in the database (`sources` field).
- Never put real affiliate IDs, API keys or network credentials in code, docs, commits or logs, and never repeat them in chat. Reference env variable names only. Exception (ADR-037): a tracking link the owner sends in chat is stored by the agent through MCP `set_affiliate_link` (encrypted) — nowhere else.
- Code and docs in English; talk to the owner in Slovenian.

Next.js version note: this repo uses Next.js 16.4 (`proxy.ts` instead of middleware, Cache Components on, async params). Read the version-matched docs in `node_modules/next/dist/docs/` before writing Next.js code (see `AGENTS.md`).
