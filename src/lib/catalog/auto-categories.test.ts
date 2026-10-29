import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bundle from "@/data/research-bundle.json";
import { bundleSchema, importResearchBundle } from "@/lib/admin/facts-import";
import { freshDb } from "../../../test/db";
import { AUTO_CATEGORIES, syncAutoCategories } from "./auto-categories";

let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;
beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
});
afterAll(async () => {
  await db?.drop();
});

describe("auto categories (TASK-023)", () => {
  it("are created by the facts import and follow the facts; idempotent; manual categories untouched", async () => {
    await sql`insert into categories (slug, name) values ('hand-made', 'Hand made')`;
    await importResearchBundle(sql, "t@example.com", bundleSchema.parse(bundle));
    const cats = await sql<{ slug: string; n: number; is_nsfw: boolean }[]>`
      select c.slug, c.is_nsfw, count(ac.app_id)::int as n from categories c
      left join app_categories ac on ac.category_id = c.id group by c.id`;
    const by = Object.fromEntries(cats.map((c) => [c.slug, c]));
    for (const c of AUTO_CATEGORIES) expect(by[c.slug], c.slug).toBeDefined();
    expect(by["nsfw-ai-chat"]!.is_nsfw).toBe(true);
    expect(by["hand-made"]!.n).toBe(0);
    const [{ n: free }] = await sql`select count(*)::int as n from apps where has_free_plan and status <> 'removed'`;
    expect(by["free-ai-companion-apps"]!.n).toBe(free);
    expect(by["ai-companion-apps"]!.n).toBeGreaterThan(by["free-ai-companion-apps"]!.n - 1);
    expect(await syncAutoCategories(sql, "t@example.com")).toBe(0);
    // a changed fact moves the app
    const [a] = await sql<{ id: string }[]>`select id from apps where slug = 'nomi-ai'`;
    await sql`update apps set has_free_plan = false where id = ${a!.id}`;
    expect(await syncAutoCategories(sql, "t@example.com")).toBe(1);
  });
});
