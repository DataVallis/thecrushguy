import type postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { freshDb } from "../../../test/db";
import {
  AdminError,
  createApp,
  createCategory,
  getApp,
  listApps,
  markVerified,
  setAppStatus,
  updateApp,
  updateCategory,
  verificationQueue,
} from "./repo";
import { APP_FIELDS, appInput, categoryInput, formToObject, type AppInput, type CategoryInput } from "./validation";

let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;
beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
});
afterAll(async () => {
  await db?.drop();
});

const ACTOR = "owner@example.com";
const T0 = new Date("2026-10-29T12:00:00Z");

function app(over: Partial<AppInput> = {}): AppInput {
  return appInput.parse({
    slug: `app-${Math.random().toString(36).slice(2, 9)}`,
    name: "Test App",
    websiteUrl: "https://example.com",
    platforms: ["web"],
    hasFreePlan: "unknown",
    featVoice: false,
    featImageGen: false,
    featVideo: false,
    featLongTermMemory: false,
    featGroupChat: false,
    featCustomCharacter: false,
    featApi: false,
    nsfwAllowed: false,
    nsfwRequiresToggle: false,
    chk18PlusTerms: false,
    chkNoMinorContent: false,
    chkNoDeepfakeFeature: false,
    chkPrivacyPolicy: false,
    chkOperatorIdentifiable: false,
    categoryIds: [],
    ...over,
  } as never);
}
const FULL = {
  chk18PlusTerms: true,
  chkNoMinorContent: true,
  chkNoDeepfakeFeature: true,
  chkPrivacyPolicy: true,
  chkOperatorIdentifiable: true,
};
const cat = (over: Partial<CategoryInput> = {}): CategoryInput =>
  categoryInput.parse({ slug: `c-${Math.random().toString(36).slice(2, 9)}`, name: "Cat", isNsfw: false, ...over });

async function auditFor(id: string) {
  return sql<{ action: string; actor_email: string; diff: Record<string, unknown> }[]>`
    select action, actor_email, diff from audit_log where entity_id = ${id} order by id`;
}
async function expectAdminError(p: Promise<unknown>, field: string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AdminError);
  expect((err as AdminError).field).toBe(field);
}

beforeEach(async () => {
  await sql`delete from app_categories`;
  await sql`delete from apps`;
  await sql`delete from categories`;
});

describe("apps: create / update / audit", () => {
  it("creates an app with categories and writes one audit row with the actor", async () => {
    const c = await createCategory(sql, ACTOR, cat());
    const id = await createApp(sql, ACTOR, app({ name: "Alpha", categoryIds: [c] }));
    const a = await getApp(sql, id);
    expect(a?.name).toBe("Alpha");
    expect(a?.category_ids).toEqual([c]);
    expect(a?.status).toBe("draft");
    const rows = await auditFor(id);
    expect(rows.map((r) => [r.action, r.actor_email])).toEqual([["create", ACTOR]]);
    expect(rows[0]!.diff.category_ids).toEqual([c]);
  });

  it("update audits only changed fields as [old, new], incl. category changes; no-op save writes nothing", async () => {
    const c1 = await createCategory(sql, ACTOR, cat());
    const c2 = await createCategory(sql, ACTOR, cat());
    const input = app({ categoryIds: [c1] });
    const id = await createApp(sql, ACTOR, input);
    await updateApp(sql, ACTOR, id, { ...input, name: "Renamed", categoryIds: [c2] });
    await updateApp(sql, ACTOR, id, { ...input, name: "Renamed", categoryIds: [c2] }); // no-op
    const rows = await auditFor(id);
    expect(rows.map((r) => r.action)).toEqual(["create", "update"]);
    expect(rows[1]!.diff).toEqual({ name: ["Test App", "Renamed"], category_ids: [[c1], [c2]] });
  });

  it("duplicate slug → field error on slug, and nothing (not even audit) is written", async () => {
    const input = app({ slug: "same-slug" });
    await createApp(sql, ACTOR, input);
    const before = await sql`select count(*)::int as n from audit_log`;
    await expectAdminError(createApp(sql, ACTOR, input), "slug");
    expect(await sql`select count(*)::int as n from audit_log`).toEqual(before);
    expect(await sql`select 1 from apps where slug = 'same-slug'`).toHaveLength(1);
  });

  it("unknown category id → field error, app not created (transaction rolled back)", async () => {
    const input = app({ categoryIds: ["00000000-0000-4000-8000-000000000000"] });
    await expectAdminError(createApp(sql, ACTOR, input), "categoryIds");
    expect(await sql`select 1 from apps where slug = ${input.slug}`).toHaveLength(0);
  });

  it("refuses to write without an actor", async () => {
    await expect(createApp(sql, "", app())).rejects.toThrow("actor is required");
  });
});

describe("compliance checklist + publish guard", () => {
  it("stamps checklist_checked_at only when all five are checked, keeps it on unrelated edits, clears it on uncheck", async () => {
    const input = app(FULL);
    const id = await createApp(sql, ACTOR, input, T0);
    expect((await getApp(sql, id))!.checklist_checked_at).toEqual(T0);

    await updateApp(sql, ACTOR, id, { ...input, name: "Other" }, new Date("2026-11-01T00:00:00Z"));
    expect((await getApp(sql, id))!.checklist_checked_at).toEqual(T0);

    await updateApp(sql, ACTOR, id, { ...input, chkPrivacyPolicy: false });
    expect((await getApp(sql, id))!.checklist_checked_at).toBeNull();
  });

  it("publishing is blocked with 4 of 5 checks (each one), allowed with all 5", async () => {
    for (const missing of Object.keys(FULL)) {
      const id = await createApp(sql, ACTOR, app({ ...FULL, [missing]: false }));
      await expectAdminError(setAppStatus(sql, ACTOR, id, "published", null), "status");
      expect((await getApp(sql, id))!.status).toBe("draft");
    }
    const ok = await createApp(sql, ACTOR, app(FULL));
    await setAppStatus(sql, ACTOR, ok, "published", null);
    expect((await getApp(sql, ok))!.status).toBe("published");
  });

  it("unchecking an item on a published app is refused (the guard also holds on edit)", async () => {
    const input = app(FULL);
    const id = await createApp(sql, ACTOR, input);
    await setAppStatus(sql, ACTOR, id, "published", null);
    await expectAdminError(updateApp(sql, ACTOR, id, { ...input, chkNoMinorContent: false }), "status");
    expect((await getApp(sql, id))!.chk_no_minor_content).toBe(true);
  });

  it("removal needs a reason; leaving 'removed' clears it; every status change is audited", async () => {
    const id = await createApp(sql, ACTOR, app());
    await expectAdminError(setAppStatus(sql, ACTOR, id, "removed", null), "removalReason");
    await setAppStatus(sql, ACTOR, id, "removed", "Minor-coded characters in gallery");
    expect((await getApp(sql, id))!.removal_reason).toBe("Minor-coded characters in gallery");
    await setAppStatus(sql, ACTOR, id, "draft", "ignored");
    expect((await getApp(sql, id))!.removal_reason).toBeNull();
    const rows = await auditFor(id);
    expect(rows.map((r) => r.action)).toEqual(["create", "status", "status"]);
    expect(rows[1]!.diff).toEqual({
      status: ["draft", "removed"],
      removal_reason: [null, "Minor-coded characters in gallery"],
    });
  });

  it("listApps flags whether the checklist is complete", async () => {
    await createApp(sql, ACTOR, app({ ...FULL, name: "Complete" }));
    await createApp(sql, ACTOR, app({ name: "Incomplete" }));
    const rows = await listApps(sql);
    expect(rows.map((r) => [r.name, r.checklist_complete])).toEqual([
      ["Complete", true],
      ["Incomplete", false],
    ]);
  });
});

describe("verification queue", () => {
  it("orders never-verified first, then oldest verified_at; excludes removed apps", async () => {
    const a = await createApp(sql, ACTOR, app({ name: "A" }));
    const b = await createApp(sql, ACTOR, app({ name: "B" }));
    const c = await createApp(sql, ACTOR, app({ name: "C" }));
    const d = await createApp(sql, ACTOR, app({ name: "D" }));
    await markVerified(sql, ACTOR, a, new Date("2026-10-01T00:00:00Z"));
    await markVerified(sql, ACTOR, b, new Date("2026-09-01T00:00:00Z"));
    await setAppStatus(sql, ACTOR, d, "removed", "gone");
    expect((await verificationQueue(sql)).map((r) => r.name)).toEqual(["C", "B", "A"]);
    expect((await auditFor(a)).map((r) => r.action)).toEqual(["create", "verify"]);
    expect(c).toBeTruthy();
  });
});

describe("categories", () => {
  it("rejects a parent loop (A → B → A) and self-parenting", async () => {
    const a = await createCategory(sql, ACTOR, cat({ slug: "a" }));
    const b = await createCategory(sql, ACTOR, cat({ slug: "b", parentId: a }));
    await expectAdminError(updateCategory(sql, ACTOR, a, cat({ slug: "a", parentId: b })), "parentId");
    await expectAdminError(updateCategory(sql, ACTOR, a, cat({ slug: "a", parentId: a })), "parentId");
    expect(b).toBeTruthy();
  });

  it("duplicate category slug → slug error", async () => {
    await createCategory(sql, ACTOR, cat({ slug: "dup" }));
    await expectAdminError(createCategory(sql, ACTOR, cat({ slug: "dup" })), "slug");
  });
});

describe("validation", () => {
  // Same shape formToObject produces from an empty form, plus the required text fields.
  const base = {
    ...formToObject(new FormData(), APP_FIELDS),
    slug: "x",
    name: "X",
    websiteUrl: "https://x.test",
    hasFreePlan: "unknown",
  };
  it("prices become integer cents; malformed prices and price without currency are rejected", () => {
    const f = (p: string, currency = "EUR") => appInput.safeParse({ ...base, startingPriceCents: p, currency });
    expect(f("9.99").data?.startingPriceCents).toBe(999);
    expect(f("9,9").data?.startingPriceCents).toBe(990);
    expect(f("0").data?.startingPriceCents).toBe(0);
    expect(f("12").data?.startingPriceCents).toBe(1200);
    for (const bad of ["-1", "9.999", "abc", "1e3"]) expect(f(bad).success).toBe(false);
    expect(f("9.99", "").success).toBe(false);
  });

  it("scores accept 0 and 100, reject -1 and 101 and decimals", () => {
    const f = (v: string) => appInput.safeParse({ ...base, scoreValue: v }).success;
    expect([f("0"), f("100"), f(""), f("-1"), f("101"), f("50.5")]).toEqual([true, true, true, false, false, false]);
  });

  it("only http(s) URLs; slugs must be kebab-case", () => {
    expect(appInput.safeParse({ ...base, websiteUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(appInput.safeParse({ ...base, privacyPolicyUrl: "ftp://x" }).success).toBe(false);
    expect(appInput.safeParse({ ...base, slug: "Bad Slug" }).success).toBe(false);
  });

  it("formToObject reads only whitelisted fields (no mass assignment of status, ids or checklist stamps)", () => {
    const fd = new FormData();
    fd.set("name", "N");
    fd.set("status", "published");
    fd.set("checklist_checked_at", "2020-01-01");
    fd.set("chk18PlusTerms", "on");
    fd.append("platforms", "web");
    fd.append("platforms", "ios");
    const o = formToObject(fd, APP_FIELDS);
    expect(o.status).toBeUndefined();
    expect(o.checklist_checked_at).toBeUndefined();
    expect(o.chk18PlusTerms).toBe(true);
    expect(o.chkNoMinorContent).toBe(false);
    expect(o.platforms).toEqual(["web", "ios"]);
  });
});
