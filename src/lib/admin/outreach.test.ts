import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bundle from "@/data/research-bundle.json";
import { freshDb } from "../../../test/db";
import { bundleSchema, importResearchBundle } from "./facts-import";
import { forgottenApps, isDue, listOutreach, seedOutreach, upsertOutreach } from "./outreach";

let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;
const actor = "owner@example.com";
beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
  await importResearchBundle(sql, actor, bundleSchema.parse(bundle));
});
afterAll(async () => {
  await db?.drop();
});

describe("affiliate outreach (TASK-025)", () => {
  it("seeds the researched programs once and links them to apps", async () => {
    const n = await seedOutreach(sql, actor);
    expect(n).toBeGreaterThan(15);
    expect(await seedOutreach(sql, actor)).toBe(0);
    const rows = await listOutreach(sql);
    const candy = rows.find((r) => r.program === "Candy AI")!;
    expect(candy).toMatchObject({ status: "to_apply", app_slug: "candy-ai" });
    expect(rows.find((r) => r.program === "CrakRevenue")!.app_slug).toBeNull();
  });

  it("applied sets dates and a follow-up; approved clears the follow-up; audited", async () => {
    const now = new Date("2026-10-30T10:00:00Z");
    await upsertOutreach(sql, actor, { program: "candy ai", status: "applied" }, now);
    let candy = (await listOutreach(sql)).find((r) => r.program === "Candy AI")!;
    expect(candy.applied_at!.toISOString().slice(0, 10)).toBe("2026-10-30");
    expect(candy.follow_up_at!.toISOString().slice(0, 10)).toBe("2026-11-06");
    expect(isDue(candy, new Date("2026-11-07T00:00:00Z"))).toBe(true);
    await upsertOutreach(sql, actor, { program: "Candy AI", status: "approved" });
    candy = (await listOutreach(sql)).find((r) => r.program === "Candy AI")!;
    expect(candy.follow_up_at).toBeNull();
    const [{ n }] = await sql`select count(*)::int as n from audit_log where entity = 'affiliate_outreach'`;
    expect(n).toBeGreaterThan(2);
  });

  it("rejects bad input and flags published apps with nothing in progress", async () => {
    await expect(upsertOutreach(sql, actor, { program: "X", signupUrl: "nope" })).rejects.toThrow();
    await expect(upsertOutreach(sql, actor, { program: "X", appSlug: "missing-app" })).rejects.toThrow();
    const [a] = await sql<
      { id: string }[]
    >`insert into apps (slug, name, website_url) values ('lonely', 'Lonely', 'https://l.test') returning id`;
    await sql.unsafe(`update apps set chk_18plus_terms=true, chk_no_minor_content=true, chk_no_deepfake_feature=true,
      chk_privacy_policy=true, chk_operator_identifiable=true, checklist_checked_at=now(), status='published' where id='${a!.id}'`);
    expect((await forgottenApps(sql)).map((x) => x.slug)).toContain("lonely");
  });
});
