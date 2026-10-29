import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bundle from "@/data/research-bundle.json";
import { freshDb } from "../../../test/db";
import { bundleSchema, importResearchBundle } from "./facts-import";
import { AdminError, publishAfterGalleryCheck, reviewQueue } from "./repo";

/** TASK-016 / ADR-030: the shipped research bundle imports cleanly and the review queue publishes safely. */
let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;
const actor = "owner@example.com";
beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
});
afterAll(async () => {
  await db?.drop();
});

describe("research bundle import", () => {
  it("creates drafts and data reviews, publishes nothing, sets no gallery check", async () => {
    const r = await importResearchBundle(sql, actor, bundleSchema.parse(bundle));
    expect(r.seed.errors).toEqual([]);
    expect(r.facts.errors).toEqual([]);
    expect(r.facts.notFound).toEqual([]);
    expect(r.facts.updated).toBeGreaterThan(20);
    expect(r.facts.held.length).toBeGreaterThan(0);
    const [c] = await sql`select count(*) filter (where status <> 'draft')::int as live,
      count(*) filter (where chk_no_minor_content)::int as gallery,
      count(*) filter (where review_method = 'data')::int as data from apps`;
    expect(c).toMatchObject({ live: 0, gallery: 0, data: r.facts.updated });
    // every data review has a source for its price
    const bad = await sql`select a.slug from apps a join pricing_plans p on p.app_id = a.id
      left join sources s on s.id = p.source_id where s.url !~ '^https?://'`;
    expect(bad).toHaveLength(0);
  });

  it("is idempotent", async () => {
    const [{ n: before }] = await sql`select count(*)::int as n from audit_log`;
    const r = await importResearchBundle(sql, actor, bundleSchema.parse(bundle));
    expect(r.facts.updated).toBe(0);
    expect(r.seed.created + r.seed.updated).toBe(0);
    const [{ n: after }] = await sql`select count(*)::int as n from audit_log`;
    expect(after).toBe(before);
  });

  it("never overwrites a hands-on review", async () => {
    await sql`update apps set review_method = 'hands_on', verdict_md = 'Our own test.' where slug = 'nomi-ai'`;
    const r = await importResearchBundle(sql, actor, bundleSchema.parse(bundle));
    expect(r.facts.skippedHandsOn).toContain("nomi-ai");
    const [a] = await sql`select verdict_md from apps where slug = 'nomi-ai'`;
    expect(a!.verdict_md).toBe("Our own test.");
  });
});

describe("owner additions (TASK-020)", () => {
  it("a manual sourced price feeds the formula; manual checklist ticks survive a re-import", async () => {
    const { recomputeApp } = await import("./facts-import");
    const [a] = await sql<
      { id: string; score_value: number }[]
    >`select id, score_value from apps where slug = 'candy-ai'`;
    const [src] = await sql<{ id: string }[]>`insert into sources (app_id, url, field, checked_at)
      values (${a!.id}, 'https://candy.ai/premium', 'pricing', now()) returning id`;
    await sql`insert into pricing_plans (app_id, name, price_cents, currency, period, source_id)
      values (${a!.id}, 'Monthly', 1299, 'USD', 'month', ${src!.id})`;
    await sql`update apps set chk_18plus_terms = true where id = ${a!.id}`;
    expect(await recomputeApp(sql, actor, a!.id)).toBe(true);
    const [b] = await sql`select score_value, starting_price_cents, chk_18plus_terms from apps where id = ${a!.id}`;
    expect(b!.starting_price_cents).toBe(1299);
    expect(b!.score_value).toBeGreaterThan(a!.score_value);
    expect(b!.chk_18plus_terms).toBe(true);
    const plans = await sql`select notes from pricing_plans where app_id = ${a!.id}`;
    expect(plans).toHaveLength(1); // no extra imported row next to the owner's plan
    await importResearchBundle(sql, actor, bundleSchema.parse(bundle));
    const [c] = await sql`select chk_18plus_terms, starting_price_cents from apps where id = ${a!.id}`;
    expect(c).toMatchObject({ chk_18plus_terms: true, starting_price_cents: 1299 });
  });
});

describe("review queue", () => {
  it("lists ready apps first; gallery OK publishes in one audited step", async () => {
    const q = await reviewQueue(sql);
    const ready = q.filter((x) => x.blockers.length === 0);
    expect(ready.length).toBeGreaterThan(0);
    const app = ready[0]!;
    await publishAfterGalleryCheck(sql, actor, app.id);
    const [a] = await sql`select status, chk_no_minor_content, checklist_note from apps where id = ${app.id}`;
    expect(a).toMatchObject({ status: "published", chk_no_minor_content: true });
    expect(a!.checklist_note).toContain(actor);
    const [log] =
      await sql`select actor_email from audit_log where entity_id = ${app.id} and action = 'gallery-check-publish'`;
    expect(log!.actor_email).toBe(actor);
  });

  it("refuses to publish an app that is not ready (and changes nothing)", async () => {
    const q = await reviewQueue(sql);
    const blocked = q.find((x) => x.blockers.length > 0)!;
    await expect(publishAfterGalleryCheck(sql, actor, blocked.id)).rejects.toBeInstanceOf(AdminError);
    const [a] = await sql`select status, chk_no_minor_content from apps where id = ${blocked.id}`;
    expect(a).toMatchObject({ status: "draft", chk_no_minor_content: false });
  });
});
