/**
 * Import of sourced public facts → data-based reviews (ADR-030, TASK-016).
 *
 * For every app in the bundle: store the facts, compute scores/reasons/pros/cons/verdict with
 * `computeDataReview`, set the fact-derived columns, add every source URL to `sources`, keep one imported
 * "Starting plan" price, and set the three checklist items public facts can settle (18+ terms, privacy policy,
 * operator) plus "no deepfake feature" from the seed research. "No minor-coded content" is NEVER set here — that
 * stays a human gallery check (07-LEGAL §2, owner decision 2026-10-29). Status is never changed here.
 *
 * Never overwrites a hands-on review. Idempotent: same facts → no writes, no audit rows.
 */
import type postgres from "postgres";
import { z } from "zod";
import { computeDataReview, factsSchema } from "@/lib/review/data-review";
import { importAppsCsv, type ImportReport } from "./csv-import";
import { assertPublishable, audit, changes, type Tx } from "./repo";

/** Marks the one price row the facts import manages (shown publicly as the plan note). */
/** Note used by the first TASK-016 build; rows with it are still managed (and renamed) by the import. */
const LEGACY_PLAN_NOTE = "Imported from public facts (ADR-030)";
export const IMPORTED_PLAN_NOTE = "Cheapest monthly price on the app's pricing page or store listing";

const bundleFacts = z.array(
  z
    .object({
      slug: z.string(),
      no_deepfake_feature: z.object({ v: z.string(), src: z.string() }).optional(),
      hold: z.string().optional(),
    })
    .passthrough(),
);

export type FactsReport = {
  updated: number;
  unchanged: number;
  held: string[];
  skippedHandsOn: string[];
  notFound: string[];
  errors: string[];
};

export async function importFacts(sql: postgres.Sql, actor: string, input: unknown): Promise<FactsReport> {
  if (!actor) throw new Error("actor is required");
  const report: FactsReport = { updated: 0, unchanged: 0, held: [], skippedHandsOn: [], notFound: [], errors: [] };
  const list = bundleFacts.safeParse(input);
  if (!list.success) return { ...report, errors: ["Facts must be a JSON array of objects with a slug"] };

  // Validate everything first (all-or-nothing, like the CSV import).
  const items: { raw: Record<string, unknown> }[] = [];
  for (const raw of list.data) {
    if (raw.hold) {
      report.held.push(`${raw.slug}: ${raw.hold}`);
      continue;
    }
    const parsed = factsSchema.safeParse(raw);
    if (!parsed.success) report.errors.push(`${raw.slug}: ${parsed.error.issues[0]?.message ?? "invalid facts"}`);
    else items.push({ raw });
  }
  if (report.errors.length) return report;

  try {
    await runFacts(sql, actor, items, report);
  } catch (err) {
    const e = err as { constraint_name?: string; message?: string; field?: string };
    if (e.constraint_name === "apps_publish_requires_checklist")
      return { ...report, updated: 0, errors: ["A published app would lose a checklist item — unpublish it first"] };
    if (e.field) return { ...report, updated: 0, errors: [e.message ?? "quality gate failed"] };
    throw err;
  }
  return report;
}

async function runFacts(
  sql: postgres.Sql,
  actor: string,
  items: { raw: Record<string, unknown> }[],
  report: FactsReport,
): Promise<void> {
  await sql.begin(async (tx) => {
    for (const { raw } of items) {
      const slug = raw.slug as string;
      const [before] = await tx<Record<string, unknown>[]>`select * from apps where slug = ${slug} for update`;
      if (!before) {
        report.notFound.push(slug);
        continue;
      }
      if (before.review_method === "hands_on" && before.verdict_md) {
        report.skippedHandsOn.push(slug);
        continue;
      }
      const r = computeDataReview(before.name as string, raw);
      const f = factsSchema.parse(raw);
      const checkedAt = new Date(`${f.checked_at}T00:00:00Z`);
      const deepfake = raw.no_deepfake_feature as { v: string; src: string } | undefined;
      const cols: Record<string, unknown> = {
        review_method: "data",
        facts: raw,
        facts_checked_at: checkedAt,
        score_conversation: null,
        score_memory: r.scores.memory,
        score_customization: r.scores.customization,
        score_media: r.scores.media,
        score_value: r.scores.value,
        score_privacy: r.scores.privacy,
        score_conversation_note: r.notes.conversation,
        score_memory_note: r.notes.memory,
        score_customization_note: r.notes.customization,
        score_media_note: r.notes.media,
        score_value_note: r.notes.value,
        score_privacy_note: r.notes.privacy,
        pros: r.pros,
        cons: r.cons,
        verdict_md: r.verdict,
        has_free_plan: r.hasFreePlan,
        starting_price_cents: r.startingPriceCents,
        currency: r.currency,
        feat_voice: r.features.voice,
        feat_image_gen: r.features.imageGen,
        feat_long_term_memory: r.features.memory,
        feat_group_chat: r.features.groupChat,
        feat_custom_character: r.features.customCharacter,
        nsfw_allowed: r.nsfwAllowed,
        chk_18plus_terms: r.checklist.chk18PlusTerms,
        chk_privacy_policy: r.checklist.chkPrivacyPolicy,
        chk_operator_identifiable: r.checklist.chkOperatorIdentifiable,
        chk_no_deepfake_feature: deepfake?.v === "yes" && /^https?:\/\//.test(deepfake.src),
      };
      // jsonb does not keep key order: keep the stored object when the content is the same.
      if (canonical(before.facts) === canonical(raw)) cols.facts = before.facts;
      if (r.platforms.length) cols.platforms = r.platforms;
      if (r.companyName) cols.company_name = r.companyName;
      if (r.companyCountry) cols.company_country = r.companyCountry;
      if (r.privacyPolicyUrl) cols.privacy_policy_url = r.privacyPolicyUrl;
      // A published app must not silently lose a checklist item: unpublish is a human decision.
      const diff = changes(before, cols);
      const sourcesAdded = await syncSources(tx, before.id as string, r.sources, checkedAt, deepfake);
      const planChanged = await syncPlan(tx, actor, before.id as string, r, checkedAt);
      if (!Object.keys(diff).length && !sourcesAdded && !planChanged) {
        report.unchanged++;
        continue;
      }
      if (Object.keys(diff).length) {
        await tx`update apps set ${tx(cols as Record<string, postgres.ParameterOrJSON<never>>)} where id = ${before.id as string}`;
        // facts JSON can be large — the audit row records which columns changed plus the new scores.
        const { facts: _facts, ...small } = diff;
        await audit(tx, actor, "import-facts", "app", before.id as string, {
          ...small,
          ...(_facts ? { facts: "replaced" } : {}),
        });
      }
      if (before.status === "published") await assertPublishable(tx, before.id as string);
      report.updated++;
    }
  });
}

function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : x,
  );
}

async function syncSources(
  tx: Tx,
  appId: string,
  list: { url: string; field: string }[],
  checkedAt: Date,
  deepfake?: { v: string; src: string },
): Promise<number> {
  const all = [...list];
  if (deepfake && /^https?:\/\//.test(deepfake.src)) all.push({ url: deepfake.src, field: "no deepfake feature" });
  let added = 0;
  for (const s of all) {
    const [hit] = await tx`select 1 from sources where app_id = ${appId} and url = ${s.url} and field = ${s.field}`;
    if (hit) continue;
    await tx`insert into sources (app_id, url, field, checked_at) values (${appId}, ${s.url}, ${s.field}, ${checkedAt})`;
    added++;
  }
  return added;
}

/** One imported "Starting plan" row per app (manual plans are never touched). */
async function syncPlan(
  tx: Tx,
  actor: string,
  appId: string,
  r: ReturnType<typeof computeDataReview>,
  checkedAt: Date,
): Promise<boolean> {
  const [existing, ...dupes] = await tx<{ id: string; price_cents: number; currency: string; notes: string }[]>`
    select id, price_cents, currency, notes from pricing_plans
    where app_id = ${appId} and notes in (${IMPORTED_PLAN_NOTE}, ${LEGACY_PLAN_NOTE}) order by created_at`;
  for (const d of dupes) {
    await tx`delete from pricing_plans where id = ${d.id}`;
    await audit(tx, actor, "import-facts", "pricing_plan", d.id, { deleted: [d.price_cents, null] });
  }
  const priceSrc = r.sources.find((s) => s.field === "pricing");
  if (r.startingPriceCents === null || !r.currency || !priceSrc) {
    if (!existing) return false;
    await tx`delete from pricing_plans where id = ${existing.id}`;
    await audit(tx, actor, "import-facts", "pricing_plan", existing.id, { deleted: [existing.price_cents, null] });
    return true;
  }
  if (
    existing &&
    existing.price_cents === r.startingPriceCents &&
    existing.currency === r.currency &&
    existing.notes === IMPORTED_PLAN_NOTE
  )
    return dupes.length > 0;
  const [src] = await tx<{ id: string }[]>`
    select id from sources where app_id = ${appId} and url = ${priceSrc.url} and field = 'pricing'`;
  const sourceId =
    src?.id ??
    (
      await tx<{ id: string }[]>`insert into sources (app_id, url, field, checked_at)
        values (${appId}, ${priceSrc.url}, 'pricing', ${checkedAt}) returning id`
    )[0]!.id;
  const row = {
    name: "Starting plan",
    price_cents: r.startingPriceCents,
    currency: r.currency,
    period: "month",
    notes: IMPORTED_PLAN_NOTE,
    source_id: sourceId,
  };
  if (existing) {
    await tx`update pricing_plans set ${tx(row)} where id = ${existing.id}`;
    await audit(tx, actor, "import-facts", "pricing_plan", existing.id, {
      price_cents: [existing.price_cents, row.price_cents],
    });
  } else {
    const [ins] = await tx<{ id: string }[]>`insert into pricing_plans ${tx({ ...row, app_id: appId })} returning id`;
    await audit(tx, actor, "import-facts", "pricing_plan", ins!.id, row);
  }
  return true;
}

// ---------- research bundle (seed + facts in one file, shipped with the app) ----------

export const bundleSchema = z.object({
  generated_at: z.string(),
  seed_csv: z.string(),
  facts: z.array(z.unknown()),
});
export type ResearchBundle = z.infer<typeof bundleSchema>;

export async function importResearchBundle(
  sql: postgres.Sql,
  actor: string,
  bundle: ResearchBundle,
): Promise<{ seed: ImportReport; facts: FactsReport }> {
  // createOnly: the seed never overwrites columns the facts import (or the owner) set later.
  const seed = await importAppsCsv(sql, actor, bundle.seed_csv, { createOnly: true });
  if (seed.errors.length) {
    return { seed, facts: { updated: 0, unchanged: 0, held: [], skippedHandsOn: [], notFound: [], errors: [] } };
  }
  const facts = await importFacts(sql, actor, bundle.facts);
  return { seed, facts };
}
