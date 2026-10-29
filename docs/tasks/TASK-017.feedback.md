# TASK-017 feedback — GEO
Status: DONE

## What changed
- `src/lib/seo/geo.ts` (robots rules, llms.txt, quick answers), `src/lib/seo/indexnow.ts`; routes `/robots.txt`, `/llms.txt`, `/indexnow-key.txt`; app page "Quick answers" + FAQPage JSON-LD; admin save/status/publish ping IndexNow after the response (prod only).
- Deploy: optional GitHub variable `AI_TRAINING_BOTS=block`.

## Owner checks
- dev: https://dev.thecrushguy.com/llms.txt lists published apps; an app page shows "Quick answers" under the header. (dev robots.txt still blocks everything — correct.)
- prod (after go-live): Bing Webmaster Tools → import site from Google Search Console (runbook §7).

## Tests
`geo.test.ts`: robots groups and training switch, llms.txt order/facts, quick answers skip unknowns, IndexNow payload, prod-only ping, derived key.
