import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { sql } from "@/lib/db/client";
import { forgetKnownSlugs } from "@/lib/seo/known-slugs";
import { handleRpc, tokenOk } from "@/lib/mcp/server";

/** MCP endpoint for the research agent (TASK-021, ADR-033). Secret path token = env MCP_TOKEN. */
const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const notFound = () => new Response("Not found", { status: 404, headers: HEADERS });

export async function POST(request: NextRequest, ctx: RouteContext<"/api/mcp/[token]">): Promise<Response> {
  const { token } = await ctx.params;
  if (!tokenOk(token, process.env.MCP_TOKEN)) return notFound();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400, headers: HEADERS },
    );
  }
  let wrote = false;
  const onWrite = () => (wrote = true);
  const msgs = Array.isArray(body) ? body : [body];
  const out = [];
  for (const m of msgs) {
    const r = await handleRpc(sql(), m, onWrite);
    if (r) out.push(r);
  }
  if (wrote) {
    forgetKnownSlugs();
    revalidateTag("apps", { expire: 0 });
    revalidateTag("categories", { expire: 0 });
  }
  if (!out.length) return new Response(null, { status: 202, headers: HEADERS });
  return Response.json(Array.isArray(body) ? out : out[0], { headers: HEADERS });
}

/** No server-initiated stream (stateless server). */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/mcp/[token]">): Promise<Response> {
  const { token } = await ctx.params;
  if (!tokenOk(token, process.env.MCP_TOKEN)) return notFound();
  return new Response("Method not allowed", { status: 405, headers: { ...HEADERS, Allow: "POST" } });
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/mcp/[token]">): Promise<Response> {
  return GET(request, ctx);
}
