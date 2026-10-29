import { afterAll, describe, expect, it, vi } from "vitest";

/**
 * Integration test against a REAL Postgres (DATABASE_URL), per DEVELOPMENT-RULES.
 * Run locally with `docker compose up -d db` or in CI via the postgres service.
 */
describe("GET /api/health", () => {
  afterAll(async () => {
    const { sql } = await import("@/lib/db/client");
    await sql().end({ timeout: 1 });
  });

  it("returns 200 when the database answers", async () => {
    expect(process.env.DATABASE_URL, "DATABASE_URL must point to a test DB").toBeTruthy();
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ status: "ok", db: "ok" });
  });

  it("returns 503 without leaking details when the database is unreachable", async () => {
    vi.resetModules();
    const saved = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://nobody:wrong@127.0.0.1:1/none";
    (globalThis as Record<string, unknown>).__tcgSql = undefined;
    try {
      const { GET } = await import("./route");
      const res = await GET();
      const body = await res.json();
      expect(res.status).toBe(503);
      expect(body).toMatchObject({ status: "error", db: "down" });
      expect(JSON.stringify(body)).not.toContain("wrong");
      expect(JSON.stringify(body)).not.toContain("127.0.0.1");
    } finally {
      const { sql } = await import("@/lib/db/client");
      await sql().end({ timeout: 1 });
      (globalThis as Record<string, unknown>).__tcgSql = undefined;
      process.env.DATABASE_URL = saved;
    }
  });
});
