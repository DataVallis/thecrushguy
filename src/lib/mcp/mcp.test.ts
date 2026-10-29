import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bundle from "@/data/research-bundle.json";
import { bundleSchema, importResearchBundle } from "@/lib/admin/facts-import";
import { freshDb } from "../../../test/db";
import { handleRpc, tokenOk } from "./server";

let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;
beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
  await importResearchBundle(sql, "seed@example.com", bundleSchema.parse(bundle));
});
afterAll(async () => {
  await db?.drop();
});

const call = async (name: string, args: Record<string, unknown>) => {
  let wrote = false;
  const r = await handleRpc(
    sql,
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } },
    () => (wrote = true),
  );
  const res = r!.result as { isError?: boolean; content: { text: string }[] };
  return { wrote, error: !!res.isError, text: res.content[0]!.text };
};

describe("MCP (TASK-021)", () => {
  it("token: constant-time match, off when unset or short", () => {
    const t = "a".repeat(40);
    expect(tokenOk(t, t)).toBe(true);
    expect(tokenOk("b".repeat(40), t)).toBe(false);
    expect(tokenOk("x", undefined)).toBe(false);
    expect(tokenOk("short", "short")).toBe(false);
  });

  it("initialize + tools/list: no publish, no gallery check, no affiliate tools", async () => {
    const init = await handleRpc(
      sql,
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
      () => {},
    );
    expect((init!.result as { protocolVersion: string }).protocolVersion).toBe("2025-06-18");
    expect(await handleRpc(sql, { jsonrpc: "2.0", method: "notifications/initialized" }, () => {})).toBeNull();
    const list = await handleRpc(sql, { jsonrpc: "2.0", id: 2, method: "tools/list" }, () => {});
    const text = JSON.stringify(list!.result);
    expect(text).not.toMatch(/publish"|chk_no_minor_content"|affiliate/);
    expect(text).toContain("set_price");
  });

  it("set_price adds a sourced plan, recomputes the review and is audited", async () => {
    const r = await call("set_price", {
      slug: "candy-ai",
      plan_name: "Monthly",
      price: 13.99,
      currency: "EUR",
      period: "month",
      source_url: "https://candy.ai/premium",
    });
    expect(r.error).toBe(false);
    expect(r.wrote).toBe(true);
    const [a] = await sql`select starting_price_cents, currency from apps where slug = 'candy-ai'`;
    expect(a).toMatchObject({ starting_price_cents: 1399, currency: "EUR" });
    const [log] = await sql`select count(*)::int as n from audit_log where actor_email = 'mcp-agent@thecrushguy.com'`;
    expect(log!.n).toBeGreaterThan(0);
  });

  it("set_checklist refuses the gallery check and unsourced input", async () => {
    expect(
      (
        await call("set_checklist", {
          slug: "candy-ai",
          item: "chk_no_minor_content",
          value: true,
          source_url: "https://x.test",
          note: "n",
        })
      ).error,
    ).toBe(true);
    expect(
      (
        await call("set_checklist", {
          slug: "candy-ai",
          item: "chk_18plus_terms",
          value: true,
          source_url: "nope",
          note: "n",
        })
      ).error,
    ).toBe(true);
    const ok = await call("set_checklist", {
      slug: "candy-ai",
      item: "chk_18plus_terms",
      value: true,
      source_url: "https://candy.ai/underage-policy",
      note: "Underage Policy: users must be 18+",
    });
    expect(ok.error).toBe(false);
    const [a] = await sql`select chk_18plus_terms, status from apps where slug = 'candy-ai'`;
    expect(a).toMatchObject({ chk_18plus_terms: true, status: "draft" });
  });

  it("set_status cannot publish", async () => {
    expect((await call("set_status", { slug: "candy-ai", status: "published" })).error).toBe(true);
  });

  it("set_fact needs a quote for terms/privacy and updates the facts", async () => {
    expect(
      (
        await call("set_fact", {
          slug: "candy-ai",
          path: "terms.min_age_18",
          value: "yes",
          source_url: "https://candy.ai/underage-policy",
        })
      ).error,
    ).toBe(true);
    const r = await call("set_fact", {
      slug: "candy-ai",
      path: "terms.min_age_18",
      value: "yes",
      source_url: "https://candy.ai/underage-policy",
      quote: "users must be 18 years or older to access our services",
    });
    expect(r.error).toBe(false);
    const [a] = await sql<
      { facts: { terms: { min_age_18: { v: string } } } }[]
    >`select facts from apps where slug = 'candy-ai'`;
    expect(a!.facts.terms.min_age_18.v).toBe("yes");
  });
});
