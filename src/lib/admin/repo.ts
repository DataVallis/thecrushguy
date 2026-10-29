/**
 * Admin data access for apps and categories (TASK-011c). Raw SQL on postgres.js so it is tested directly
 * against a real database. Every write runs in one transaction together with its audit_log row: either both
 * land or neither does. Callers (server actions) must have called `requireAdmin()` and pass that email as `actor`.
 */
import type postgres from "postgres";
import type { AppInput, CategoryInput } from "./validation";

export type Tx = postgres.TransactionSql | postgres.Sql;

export class AdminError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

/** Translates database constraint violations into form-friendly errors. */
function mapPgError(err: unknown): never {
  const e = err as { code?: string; constraint_name?: string };
  const byConstraint: Record<string, [string, string]> = {
    apps_slug_uq: ["slug", "Another app already uses this slug"],
    categories_slug_uq: ["slug", "Another category already uses this slug"],
    apps_publish_requires_checklist: ["status", "All five checklist items must be checked before publishing"],
    apps_removed_needs_reason: ["removalReason", "A removal reason is required"],
    categories_not_own_parent: ["parentId", "A category can't be its own parent"],
  };
  const hit = e.constraint_name ? byConstraint[e.constraint_name] : undefined;
  if (hit) throw new AdminError(hit[0], hit[1]);
  if (e.code === "23503") throw new AdminError("categoryIds", "Unknown category");
  throw err;
}

export async function audit(
  tx: Tx,
  actor: string,
  action: string,
  entity: string,
  entityId: string,
  diff: Record<string, unknown> | null,
): Promise<void> {
  if (!actor) throw new Error("audit: actor is required");
  await tx`insert into audit_log (actor_email, action, entity, entity_id, diff)
    values (${actor}, ${action}, ${entity}, ${entityId}, ${diff === null ? null : tx.json(JSON.parse(JSON.stringify(diff)))})`;
}

/** { field: [old, new] } for changed fields only. Dates compared by value. */
export function changes(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(after)) {
    const a = before[k] instanceof Date ? (before[k] as Date).toISOString() : before[k];
    const b = v instanceof Date ? v.toISOString() : v;
    if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = [a ?? null, b ?? null];
  }
  return out;
}

// ---------- apps ----------

const CHECKS = [
  "chk_18plus_terms",
  "chk_no_minor_content",
  "chk_no_deepfake_feature",
  "chk_privacy_policy",
  "chk_operator_identifiable",
] as const;

function appColumns(a: AppInput) {
  return {
    slug: a.slug,
    name: a.name,
    tagline: a.tagline,
    description_md: a.descriptionMd,
    website_url: a.websiteUrl,
    platforms: a.platforms,
    has_free_plan: a.hasFreePlan,
    starting_price_cents: a.startingPriceCents,
    currency: a.currency,
    feat_voice: a.featVoice,
    feat_image_gen: a.featImageGen,
    feat_video: a.featVideo,
    feat_long_term_memory: a.featLongTermMemory,
    feat_group_chat: a.featGroupChat,
    feat_custom_character: a.featCustomCharacter,
    feat_api: a.featApi,
    nsfw_allowed: a.nsfwAllowed,
    nsfw_requires_toggle: a.nsfwRequiresToggle,
    company_name: a.companyName,
    company_country: a.companyCountry,
    privacy_policy_url: a.privacyPolicyUrl,
    score_conversation: a.scoreConversation,
    score_memory: a.scoreMemory,
    score_customization: a.scoreCustomization,
    score_media: a.scoreMedia,
    score_value: a.scoreValue,
    score_privacy: a.scorePrivacy,
    chk_18plus_terms: a.chk18PlusTerms,
    chk_no_minor_content: a.chkNoMinorContent,
    chk_no_deepfake_feature: a.chkNoDeepfakeFeature,
    chk_privacy_policy: a.chkPrivacyPolicy,
    chk_operator_identifiable: a.chkOperatorIdentifiable,
    checklist_note: a.checklistNote,
    score_conversation_note: a.scoreConversationNote,
    score_memory_note: a.scoreMemoryNote,
    score_customization_note: a.scoreCustomizationNote,
    score_media_note: a.scoreMediaNote,
    score_value_note: a.scoreValueNote,
    score_privacy_note: a.scorePrivacyNote,
    pros: a.pros,
    cons: a.cons,
    best_for: a.bestFor,
    verdict_md: a.verdictMd,
  };
}

/**
 * checklist_checked_at records when the checklist was last confirmed complete. It is (re)stamped when the
 * checklist becomes complete or any item changes while complete, and cleared when an item is unchecked.
 */
function checklistStamp(
  before: Record<string, unknown> | null,
  cols: ReturnType<typeof appColumns>,
  now: Date,
): Date | null {
  const complete = CHECKS.every((c) => cols[c]);
  if (!complete) return null;
  const unchanged = before && CHECKS.every((c) => before[c] === cols[c]) && before.checklist_checked_at;
  return unchanged ? (before.checklist_checked_at as Date) : now;
}

async function setCategories(tx: Tx, appId: string, categoryIds: readonly string[]): Promise<string[]> {
  const ids = [...new Set(categoryIds)].sort();
  const before = (
    await tx<{ category_id: string }[]>`
    select category_id from app_categories where app_id = ${appId} order by 1`
  ).map((r) => r.category_id);
  await tx`delete from app_categories where app_id = ${appId} and not (category_id = any(${ids}::uuid[]))`;
  if (ids.length)
    await tx`insert into app_categories ${tx(ids.map((category_id) => ({ app_id: appId, category_id })))}
      on conflict do nothing`;
  return before;
}

export async function createApp(sql: postgres.Sql, actor: string, input: AppInput, now = new Date()): Promise<string> {
  try {
    return await sql.begin(async (tx) => {
      const cols = appColumns(input);
      const [row] = await tx<{ id: string }[]>`
        insert into apps ${tx({ ...cols, checklist_checked_at: checklistStamp(null, cols, now) })} returning id`;
      await setCategories(tx, row!.id, input.categoryIds);
      await audit(tx, actor, "create", "app", row!.id, { ...cols, category_ids: input.categoryIds });
      return row!.id;
    });
  } catch (err) {
    mapPgError(err);
  }
}

export async function updateApp(
  sql: postgres.Sql,
  actor: string,
  id: string,
  input: AppInput,
  now = new Date(),
): Promise<void> {
  try {
    await sql.begin(async (tx) => {
      const [before] = await tx`select * from apps where id = ${id} for update`;
      if (!before) throw new AdminError("_form", "App not found");
      const cols = appColumns(input);
      const next = { ...cols, checklist_checked_at: checklistStamp(before, cols, now) };
      await tx`update apps set ${tx(next)} where id = ${id}`;
      if (before.status === "published") await assertPublishable(tx, id);
      const beforeCats = await setCategories(tx, id, input.categoryIds);
      const diff = changes(before, next);
      const cats = [...new Set(input.categoryIds)].sort();
      if (JSON.stringify(beforeCats) !== JSON.stringify(cats)) diff.category_ids = [beforeCats, cats];
      if (Object.keys(diff).length) await audit(tx, actor, "update", "app", id, diff);
    });
  } catch (err) {
    mapPgError(err);
  }
}

/**
 * Quality gate for published apps (06-SEO-CONTENT "No thin pages", ADR-026/030): what a published app still lacks.
 * The compliance checklist is enforced separately by the database.
 */
export async function qualityGaps(tx: Tx, id: string): Promise<string[]> {
  const [a] = await tx<Record<string, unknown>[]>`
    select a.*, (select count(*)::int from pricing_plans p where p.app_id = a.id) as plan_count
    from apps a where a.id = ${id}`;
  if (!a) return ["app not found"];
  const gaps: string[] = [];
  // Data-based reviews (ADR-030) cannot score chat quality from public facts: conversation stays empty.
  const data = a.review_method === "data";
  if (data && !a.facts) gaps.push("sourced facts");
  for (const s of ["conversation", "memory", "customization", "media", "value", "privacy"]) {
    if (a[`score_${s}`] === null && !(data && s === "conversation")) gaps.push(`${s} score`);
    if (!String(a[`score_${s}_note`] ?? "").trim()) gaps.push(`${s} reason`);
  }
  if (!String(a.verdict_md ?? "").trim()) gaps.push("verdict");
  if ((a.pros as string[]).length < 3) gaps.push("3 pros");
  if ((a.cons as string[]).length < 3) gaps.push("3 cons");
  if ((a.plan_count as number) < 1) gaps.push("a sourced price");
  return gaps;
}

export async function assertPublishable(tx: Tx, id: string): Promise<void> {
  const gaps = await qualityGaps(tx, id);
  if (gaps.length) throw new AdminError("status", `A published app needs: ${gaps.join(", ")}`);
}

export async function setAppStatus(
  sql: postgres.Sql,
  actor: string,
  id: string,
  status: "draft" | "published" | "paused" | "removed",
  removalReason: string | null,
): Promise<void> {
  try {
    await sql.begin(async (tx) => {
      const [before] = await tx<{ status: string; removal_reason: string | null }[]>`
        select status, removal_reason from apps where id = ${id} for update`;
      if (!before) throw new AdminError("_form", "App not found");
      const reason = status === "removed" ? removalReason : null;
      await tx`update apps set status = ${status}, removal_reason = ${reason} where id = ${id}`;
      if (status === "published") await assertPublishable(tx, id);
      await audit(tx, actor, "status", "app", id, changes(before, { status, removal_reason: reason }));
    });
  } catch (err) {
    mapPgError(err);
  }
}

export async function markVerified(sql: postgres.Sql, actor: string, id: string, now = new Date()): Promise<void> {
  await sql.begin(async (tx) => {
    const [before] = await tx<{ verified_at: Date | null }[]>`select verified_at from apps where id = ${id} for update`;
    if (!before) throw new AdminError("_form", "App not found");
    await tx`update apps set verified_at = ${now} where id = ${id}`;
    await audit(tx, actor, "verify", "app", id, changes(before, { verified_at: now }));
  });
}

export type AppRow = Record<string, unknown> & { id: string; slug: string; name: string; status: string };

export async function listApps(sql: postgres.Sql): Promise<AppRow[]> {
  return sql<AppRow[]>`
    select id, slug, name, status, verified_at, updated_at,
      (chk_18plus_terms and chk_no_minor_content and chk_no_deepfake_feature and chk_privacy_policy
        and chk_operator_identifiable and checklist_checked_at is not null) as checklist_complete
    from apps order by name`;
}

/** Verification queue (01-PRODUCT-SPEC §6): never-verified first, then oldest `verified_at`. Removed apps excluded. */
export async function verificationQueue(sql: postgres.Sql, limit = 20): Promise<AppRow[]> {
  return sql<AppRow[]>`
    select id, slug, name, status, verified_at from apps where status <> 'removed'
    order by verified_at asc nulls first, name limit ${limit}`;
}

export async function getApp(sql: postgres.Sql, id: string): Promise<(AppRow & { category_ids: string[] }) | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await sql<(AppRow & { category_ids: string[] })[]>`
    select a.*, coalesce(array_agg(ac.category_id) filter (where ac.category_id is not null), '{}') as category_ids
    from apps a left join app_categories ac on ac.app_id = a.id where a.id = ${id} group by a.id`;
  return row ?? null;
}

// ---------- categories ----------

function categoryColumns(c: CategoryInput) {
  return {
    slug: c.slug,
    name: c.name,
    description: c.description,
    parent_id: c.parentId,
    sort: c.sort,
    is_nsfw: c.isNsfw,
  };
}

/** Rejects a parent that would create a cycle (the DB only blocks the direct self-reference). */
async function assertNoCycle(tx: Tx, id: string, parentId: string | null): Promise<void> {
  if (!parentId) return;
  const [hit] = await tx`
    with recursive up(id, parent_id) as (
      select id, parent_id from categories where id = ${parentId}
      union all select c.id, c.parent_id from categories c join up on c.id = up.parent_id
    ) select 1 from up where id = ${id} limit 1`;
  if (hit) throw new AdminError("parentId", "That parent would create a loop");
}

export async function createCategory(sql: postgres.Sql, actor: string, input: CategoryInput): Promise<string> {
  try {
    return await sql.begin(async (tx) => {
      const cols = categoryColumns(input);
      const [row] = await tx<{ id: string }[]>`insert into categories ${tx(cols)} returning id`;
      await audit(tx, actor, "create", "category", row!.id, cols);
      return row!.id;
    });
  } catch (err) {
    mapPgError(err);
  }
}

export async function updateCategory(
  sql: postgres.Sql,
  actor: string,
  id: string,
  input: CategoryInput,
): Promise<void> {
  try {
    await sql.begin(async (tx) => {
      const [before] = await tx`select * from categories where id = ${id} for update`;
      if (!before) throw new AdminError("_form", "Category not found");
      const cols = categoryColumns(input);
      await assertNoCycle(tx, id, cols.parent_id);
      await tx`update categories set ${tx(cols)} where id = ${id}`;
      const diff = changes(before, cols);
      if (Object.keys(diff).length) await audit(tx, actor, "update", "category", id, diff);
    });
  } catch (err) {
    mapPgError(err);
  }
}

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort: number;
  is_nsfw: boolean;
  app_count: number;
};

export async function listCategories(sql: postgres.Sql): Promise<CategoryRow[]> {
  return sql<CategoryRow[]>`
    select c.id, c.slug, c.name, c.description, c.parent_id, c.sort, c.is_nsfw,
      (select count(*)::int from app_categories ac where ac.category_id = c.id) as app_count
    from categories c order by c.sort, c.name`;
}

export async function getCategory(sql: postgres.Sql, id: string): Promise<CategoryRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await listCategories(sql)).find((c) => c.id === id) ?? null;
}

export type AuditRow = {
  id: number;
  actor_email: string;
  action: string;
  entity: string;
  entity_id: string | null;
  diff: unknown;
  at: Date;
};

export async function recentAudit(sql: postgres.Sql, limit = 100): Promise<AuditRow[]> {
  return sql<AuditRow[]>`select * from audit_log order by id desc limit ${limit}`;
}

// ---------- data-based reviews: review queue (ADR-030, TASK-016) ----------

export type QueueItem = {
  id: string;
  slug: string;
  name: string;
  websiteUrl: string;
  overall: number;
  nsfwAllowed: boolean;
  factsNotes: string | null;
  /** Everything except the human gallery check that still blocks publishing. */
  blockers: string[];
};

const AUTO_CHECKS: [string, string][] = [
  ["chk_18plus_terms", "terms don't state 18+"],
  ["chk_privacy_policy", "no privacy policy"],
  ["chk_operator_identifiable", "operator not identifiable"],
  ["chk_no_deepfake_feature", "deepfake check not confirmed"],
];

/** Draft data-based reviews, ready ones first. Ready = only the gallery check (chk_no_minor_content) is missing. */
export async function reviewQueue(sql: postgres.Sql): Promise<QueueItem[]> {
  const { overallScore } = await import("@/lib/public/scoring");
  const rows = await sql<Record<string, unknown>[]>`
    select * from apps where review_method = 'data' and status = 'draft' order by name`;
  const out: QueueItem[] = [];
  for (const r of rows) {
    const blockers = [
      ...AUTO_CHECKS.filter(([c]) => !r[c]).map(([, why]) => why),
      ...(await qualityGaps(sql, r.id as string)).map((g) => `missing ${g}`),
    ];
    out.push({
      id: r.id as string,
      slug: r.slug as string,
      name: r.name as string,
      websiteUrl: r.website_url as string,
      overall: overallScore({
        conversation: r.score_conversation as number | null,
        memory: r.score_memory as number | null,
        customization: r.score_customization as number | null,
        media: r.score_media as number | null,
        value: r.score_value as number | null,
        privacy: r.score_privacy as number | null,
      }),
      nsfwAllowed: r.nsfw_allowed as boolean,
      factsNotes: ((r.facts as { notes?: string } | null)?.notes ?? null) || null,
      blockers,
    });
  }
  return out.sort((a, b) => a.blockers.length - b.blockers.length || b.overall - a.overall);
}

/**
 * The owner looked at the app's public character gallery/marketing and found no minor-coded content
 * (07-LEGAL §2, the one check that is never automated) → tick it and publish in one audited step.
 * Fails (and changes nothing) if any other checklist item or the quality gate is missing.
 */
export async function publishAfterGalleryCheck(
  sql: postgres.Sql,
  actor: string,
  id: string,
  now = new Date(),
): Promise<void> {
  try {
    await sql.begin(async (tx) => {
      const [before] = await tx<Record<string, unknown>[]>`select * from apps where id = ${id} for update`;
      if (!before) throw new AdminError("_form", "App not found");
      if (before.status !== "draft") throw new AdminError("_form", "Only drafts go through the review queue");
      const next = {
        chk_no_minor_content: true,
        checklist_checked_at: now,
        checklist_note: `Gallery/marketing checked for minor-coded content by ${actor} on ${now.toISOString().slice(0, 10)}`,
        status: "published",
        verified_at: now,
      };
      await tx`update apps set ${tx(next)} where id = ${id}`;
      await assertPublishable(tx, id);
      await audit(tx, actor, "gallery-check-publish", "app", id, changes(before, next));
    });
  } catch (err) {
    mapPgError(err);
  }
}
