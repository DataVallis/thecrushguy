/**
 * Minimal MCP server over Streamable HTTP, stateless, JSON responses (TASK-021). No SDK dependency: the protocol
 * subset we need is initialize, tools/list, tools/call and notifications. Auth = secret token in the URL path
 * (`/api/mcp/<MCP_TOKEN>`), compared in constant time; no token configured → the endpoint does not exist.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import type postgres from "postgres";
import { z } from "zod";
import { AdminError } from "@/lib/admin/repo";
import { TOOLS } from "./tools";

export const PROTOCOL_VERSION = "2025-06-18";
const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

export function tokenOk(given: string, expected: string | undefined): boolean {
  if (!expected || expected.length < 32) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };
type RpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
};

const ok = (id: Rpc["id"], result: unknown): RpcResponse => ({ jsonrpc: "2.0", id: id ?? null, result });
const fail = (id: Rpc["id"], code: number, message: string): RpcResponse => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

export const WRITE_TOOLS = new Set(
  TOOLS.filter((t) => !/^(review_queue|list_apps|get_app|list_outreach)$/.test(t.name)).map((t) => t.name),
);

/** Handles one JSON-RPC message; returns null for notifications. `onWrite` runs after a successful write tool. */
export async function handleRpc(sql: postgres.Sql, msg: Rpc, onWrite: () => void): Promise<RpcResponse | null> {
  if (msg.id === undefined) return null; // notification (e.g. notifications/initialized)
  switch (msg.method) {
    case "initialize": {
      const asked = String(msg.params?.protocolVersion ?? PROTOCOL_VERSION);
      return ok(msg.id, {
        protocolVersion: SUPPORTED.includes(asked) ? asked : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "thecrushguy-admin", version: "1.0.0" },
        instructions:
          "Admin data tools for The Crush Guy. Every fact needs a source URL you actually opened; never invent prices, ratings or user counts. Public, SFW pages only — never open galleries or explicit pages. You cannot publish or do the gallery check; the owner does that in /admin/research. Affiliate tracking links: store only links the owner sent you (set_affiliate_link) and never repeat them anywhere.",
      });
    }
    case "ping":
      return ok(msg.id, {});
    case "tools/list":
      return ok(msg.id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: z.toJSONSchema(t.input, { io: "input" }),
          annotations: { readOnlyHint: !WRITE_TOOLS.has(t.name), destructiveHint: t.name === "set_status" },
        })),
      });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return fail(msg.id, -32602, `Unknown tool: ${name}`);
      const args = tool.input.safeParse(msg.params?.arguments ?? {});
      if (!args.success)
        return ok(msg.id, {
          isError: true,
          content: [
            {
              type: "text",
              text: `Invalid arguments: ${args.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
            },
          ],
        });
      try {
        const out = await tool.run(sql, args.data as never);
        if (WRITE_TOOLS.has(name)) onWrite();
        return ok(msg.id, { content: [{ type: "text", text: JSON.stringify(out, null, 1) }] });
      } catch (err) {
        if (err instanceof AdminError)
          return ok(msg.id, { isError: true, content: [{ type: "text", text: err.message }] });
        const e = err as { constraint_name?: string };
        if (e.constraint_name)
          return ok(msg.id, {
            isError: true,
            content: [{ type: "text", text: `Rejected by database rule ${e.constraint_name}` }],
          });
        console.error("[mcp] tool failed:", name, err instanceof Error ? err.message : "unknown");
        return ok(msg.id, { isError: true, content: [{ type: "text", text: "Internal error" }] });
      }
    }
    default:
      return fail(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}
