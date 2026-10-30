import { readFileSync } from "node:fs";
import path from "node:path";
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "@/lib/db/migrate";
import { freshDb } from "../../../test/db";

let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;

beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
});
afterAll(async () => {
  await db?.drop();
});

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";
const NOT_NULL_VIOLATION = "23502";

const FULL_CHECKLIST = {
  chk_18plus_terms: true,
  chk_no_minor_content: true,
  chk_no_deepfake_feature: true,
  chk_privacy_policy: true,
  chk_operator_identifiable: true,
  checklist_checked_at: new Date("2026-10-29T12:00:00Z"),
};

async function insertApp(fields: Record<string, unknown> = {}) {
  const row = {
    slug: `app-${Math.random().toString(36).slice(2, 10)}`,
    name: "Test",
    website_url: "https://example.com",
    ...fields,
  };
  const [created] = await sql`insert into apps ${sql(row)} returning id, status`;
  return created as { id: string; status: string };
}

async function expectPgError(p: Promise<unknown>, code: string, constraint?: string) {
  const err = (await p.then(
    () => null,
    (e: unknown) => e,
  )) as { code?: string; constraint_name?: string } | null;
  expect(err, "expected the database to reject this").not.toBeNull();
  expect(err?.code).toBe(code);
  if (constraint) expect(err?.constraint_name).toBe(constraint);
}

describe("migrations", () => {
  it("create every table from zero", async () => {
    const rows = await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`;
    expect(rows.map((r) => r.table_name)).toEqual([
      "admin_login_tokens",
      "admin_sessions",
      "affiliate_links",
      "affiliate_outreach",
      "app_categories",
      "apps",
      "audit_log",
      "auth_rate_events",
      "categories",
      "clicks",
      "pricing_plans",
      "sources",
      "translations",
    ]);
  });

  it("are idempotent (second run applies nothing new)", async () => {
    await runMigrations(db.url);
    const [{ n }] = await sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
    // one row per migration file in drizzle/meta/_journal.json
    const journal = JSON.parse(readFileSync(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8")) as {
      entries: unknown[];
    };
    expect(n).toBe(journal.entries.length);
  });
});

describe("publish guard (07-LEGAL §2 checklist)", () => {
  it("accepts a published app with the full checklist", async () => {
    const app = await insertApp({ ...FULL_CHECKLIST, status: "published" });
    expect(app.status).toBe("published");
  });

  it.each(Object.keys(FULL_CHECKLIST))("rejects publishing when %s is missing", async (key) => {
    const fields: Record<string, unknown> = { ...FULL_CHECKLIST, status: "published" };
    fields[key] = key === "checklist_checked_at" ? null : false;
    await expectPgError(insertApp(fields), CHECK_VIOLATION, "apps_publish_requires_checklist");
  });

  it("blocks draft → published on update and leaves the row a draft", async () => {
    const app = await insertApp({ ...FULL_CHECKLIST, chk_no_minor_content: false });
    await expectPgError(sql`update apps set status = 'published' where id = ${app.id}`, CHECK_VIOLATION);
    const [after] = await sql`select status from apps where id = ${app.id}`;
    expect(after.status).toBe("draft");
  });

  it("requires a reason to mark an app removed", async () => {
    await expectPgError(insertApp({ status: "removed" }), CHECK_VIOLATION, "apps_removed_needs_reason");
    const ok = await insertApp({ status: "removed", removal_reason: "minor-coded characters found 2026-10-29" });
    expect(ok.status).toBe("removed");
  });
});

describe("value rules", () => {
  it.each([0, 100])("accepts score %i", async (v) => {
    await insertApp({ score_value: v });
  });
  it.each([-1, 101])("rejects score %i", async (v) => {
    await expectPgError(insertApp({ score_value: v }), CHECK_VIOLATION, "apps_scores_range");
  });

  it("accepts price 0 and rejects a negative price", async () => {
    await insertApp({ starting_price_cents: 0, currency: "USD" });
    await expectPgError(insertApp({ starting_price_cents: -1, currency: "USD" }), CHECK_VIOLATION, "apps_price_nonneg");
  });

  it("rejects a lowercase currency", async () => {
    await expectPgError(insertApp({ currency: "eur" }), CHECK_VIOLATION, "apps_currency_format");
  });

  it.each(["Candy AI", "-candy", "candy-", "candy--ai", "candy_ai", ""])("rejects slug %j", async (slug) => {
    await expectPgError(insertApp({ slug }), CHECK_VIOLATION, "apps_slug_format");
  });

  it("rejects a duplicate slug", async () => {
    await insertApp({ slug: "candy-ai" });
    await expectPgError(insertApp({ slug: "candy-ai" }), UNIQUE_VIOLATION, "apps_slug_uq");
  });

  it("rejects a category that is its own parent", async () => {
    const [c] = await sql`insert into categories (slug, name) values ('ai-girlfriend', 'AI girlfriend') returning id`;
    await expectPgError(sql`update categories set parent_id = ${c.id} where id = ${c.id}`, CHECK_VIOLATION);
  });
});

describe("relations", () => {
  it("requires a source for every pricing plan", async () => {
    const app = await insertApp();
    await expectPgError(
      sql`insert into pricing_plans (app_id, name, price_cents, currency, period) values (${app.id}, 'Pro', 1299, 'USD', 'month')`,
      NOT_NULL_VIOLATION,
    );
    const [src] =
      await sql`insert into sources (app_id, url, field, checked_at) values (${app.id}, 'https://example.com/pricing', 'pricing', now()) returning id`;
    await sql`insert into pricing_plans (app_id, name, price_cents, currency, period, source_id) values (${app.id}, 'Pro', 1299, 'USD', 'month', ${src.id})`;
  });

  it("allows only one active affiliate link per app", async () => {
    const app = await insertApp();
    const link = {
      app_id: app.id,
      network: "direct",
      model: "revshare",
      url_encrypted: "v1.x.y.z",
      url_hint: "example.com",
    };
    await sql`insert into affiliate_links ${sql(link)}`;
    await expectPgError(
      sql`insert into affiliate_links ${sql(link)}`,
      UNIQUE_VIOLATION,
      "affiliate_links_one_active_per_app",
    );
    await sql`insert into affiliate_links ${sql({ ...link, active: false })}`;
  });
});

describe("audit_log is append-only", () => {
  it("rejects UPDATE, DELETE and TRUNCATE and keeps the row unchanged", async () => {
    const [row] =
      await sql`insert into audit_log (actor_email, action, entity, entity_id) values ('owner@example.com', 'create', 'app', 'x') returning id`;
    for (const q of [
      sql`update audit_log set action = 'tampered' where id = ${row.id}`,
      sql`delete from audit_log where id = ${row.id}`,
      sql`truncate audit_log`,
    ]) {
      await expectPgError(q, "42501");
    }
    const [after] = await sql`select action from audit_log where id = ${row.id}`;
    expect(after.action).toBe("create");
  });
});
