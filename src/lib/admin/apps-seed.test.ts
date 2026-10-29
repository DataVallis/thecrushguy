import { readFileSync } from "node:fs";
import path from "node:path";
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freshDb } from "../../../test/db";
import { importAppsCsv } from "./csv-import";

/** docs/research/APPS-SEED.csv (TASK-006) must stay importable: every candidate row valid, excluded/hold skipped. */
let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;
beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
});
afterAll(async () => {
  await db?.drop();
});

describe("APPS-SEED.csv", () => {
  it("imports all candidates as drafts, skips excluded and hold, with no errors", async () => {
    const text = readFileSync(path.join(process.cwd(), "docs/research/APPS-SEED.csv"), "utf8");
    const statuses = text
      .split("\n")
      .slice(1)
      .filter(Boolean)
      .map((l) => l.split(",")[0]);
    const candidates = statuses.filter((s) => s === "candidate").length;
    const r = await importAppsCsv(sql, "test@example.com", text);
    expect(r.errors).toEqual([]);
    expect(r.created).toBe(candidates);
    expect(r.skipped).toBe(statuses.length - candidates);
    const [{ n }] = await sql`select count(*)::int as n from apps where status <> 'draft'`;
    expect(n).toBe(0);
  });
});
