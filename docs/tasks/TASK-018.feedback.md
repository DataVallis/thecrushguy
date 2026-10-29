# TASK-018 feedback — home & app page UX v2
Status: DONE

## What changed
- Home: dark hero + top-pick card, filterable shortlist (all published apps), top-5 table, quick answers. Header: "All apps" + "How we rank".
- Cards: fact chips (free plan, from $X, voice, pictures, memory), green/red flag, whole card clickable, Visit + Full review.
- App page: back link, Visit always (official site if no affiliate link yet), sticky mobile CTA, green/red flags near the top, sources collapsed.
- `/go` fallback → official website (ADR-032). Import dedupes the price row created by the first TASK-016 build.

## Owner checks on dev
1. Home on phone and desktop: filters toggle, "Showing n of N" updates, card opens the review.
2. Nomi page: Back link, Visit Nomi opens nomi.ai, sticky button on phone.
3. If an app shows two "Starting plan" price rows: /admin/research → Import research bundle once more (removes the duplicate).
