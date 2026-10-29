# TASK-021/022 feedback — MCP endpoint + Google Analytics
Status: DONE (needs owner secret MCP_TOKEN + connector; GA works on prod automatically)
- MCP: `src/lib/mcp/{server,tools}.ts`, route `/api/mcp/[token]`; tests `src/lib/mcp/mcp.test.ts` (no publish / gallery / affiliate tools, sourced writes, audit).
- GA4 with consent banner on prod only; privacy policy updated; outbound clicks as `visit_app` events.
- Candy AI facts: 18+ and adult content confirmed on its Underage Policy (bundle rebuilt).
- Manual monthly plan now wins over a yearly one as starting price.
