"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  AdminError,
  createApp,
  createCategory,
  markVerified,
  publishAfterGalleryCheck,
  setAppStatus,
  updateApp,
  updateCategory,
} from "@/lib/admin/repo";
import {
  APP_FIELDS,
  CATEGORY_FIELDS,
  appInput,
  categoryInput,
  fieldErrors,
  formToObject,
  statusInput,
} from "@/lib/admin/validation";
import { importAppsCsv, type ImportReport } from "@/lib/admin/csv-import";
import { bundleSchema, importResearchBundle, recomputeApp, type FactsReport } from "@/lib/admin/facts-import";
import {
  addSource,
  affiliateInput,
  deletePricingPlan,
  deleteSource,
  pricingInput,
  saveAffiliateLink,
  savePricingPlan,
  sourceInput,
} from "@/lib/admin/listing";
import { requireAdmin } from "@/lib/auth/session";
import { syncAutoCategories } from "@/lib/catalog/auto-categories";
import { forgetKnownSlugs } from "@/lib/seo/known-slugs";
import { appUrls, pingIndexNow } from "@/lib/seo/indexnow";
import { siteUrl } from "@/lib/env";
import { sql } from "@/lib/db/client";

/**
 * Admin mutations (TASK-011c). EVERY exported action starts with `await requireAdmin()` — enforced by
 * src/app/admin/actions.guard.test.ts. Identity comes from the session, never from the form.
 */

export type FormState = {
  errors?: Record<string, string>;
  values?: Record<string, unknown>;
  seq: number;
};

function failure(prev: FormState, errors: Record<string, string>, values: Record<string, unknown>): FormState {
  return { errors, values, seq: prev.seq + 1 };
}

/** Cache tags for public pages (ADR-013); public pages tag their data with these in TASK-012. */
/** After the response: tell IndexNow (Bing → ChatGPT search) that the app's pages changed (prod only). */
function announceApp(id: string | null) {
  if (!id) return;
  after(async () => {
    const [row] = await sql()<{ slug: string }[]>`select slug from apps where id = ${id}`;
    if (row) await pingIndexNow(appUrls(siteUrl(), row.slug));
  });
}

function invalidateApps(slug?: string) {
  forgetKnownSlugs(); // proxy 404 check sees new/renamed/unpublished slugs immediately
  updateTag("apps");
  if (slug) updateTag(`app:${slug}`);
}

export async function saveAppAction(id: string | null, prev: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  const raw = formToObject(form, APP_FIELDS);
  const parsed = appInput.safeParse(raw);
  if (!parsed.success) return failure(prev, fieldErrors(parsed.error), raw);
  let savedId = id;
  try {
    if (id) await updateApp(sql(), actor, id, parsed.data);
    else savedId = await createApp(sql(), actor, parsed.data);
  } catch (err) {
    if (err instanceof AdminError) return failure(prev, { [err.field]: err.message }, raw);
    throw err;
  }
  await syncAutoCategories(sql(), actor); // fact-driven lists follow edited features/prices (TASK-023)
  invalidateApps(parsed.data.slug);
  updateTag("categories");
  announceApp(savedId);
  redirect(`/admin/apps/${savedId}?saved=1`);
}

export async function setStatusAction(id: string, prev: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  const raw = { status: form.get("status"), removalReason: form.get("removalReason") ?? undefined };
  const parsed = statusInput.safeParse(raw);
  if (!parsed.success) return failure(prev, fieldErrors(parsed.error), raw);
  try {
    await setAppStatus(sql(), actor, id, parsed.data.status, parsed.data.removalReason);
  } catch (err) {
    if (err instanceof AdminError) return failure(prev, { [err.field]: err.message }, raw);
    throw err;
  }
  invalidateApps();
  announceApp(id);
  redirect(`/admin/apps/${id}?saved=1`);
}

export async function markVerifiedAction(id: string): Promise<void> {
  const actor = await requireAdmin();
  await markVerified(sql(), actor, id);
  invalidateApps();
  redirect(`/admin/apps/${id}?saved=1`);
}

export async function saveCategoryAction(id: string | null, prev: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  const raw = formToObject(form, CATEGORY_FIELDS);
  const parsed = categoryInput.safeParse(raw);
  if (!parsed.success) return failure(prev, fieldErrors(parsed.error), raw);
  try {
    if (id) await updateCategory(sql(), actor, id, parsed.data);
    else await createCategory(sql(), actor, parsed.data);
  } catch (err) {
    if (err instanceof AdminError) return failure(prev, { [err.field]: err.message }, raw);
    throw err;
  }
  forgetKnownSlugs();
  updateTag("categories");
  redirect("/admin/categories?saved=1");
}

// ---------- TASK-011d: sources, pricing, affiliate links, CSV import ----------

async function listingWrite(
  appId: string,
  prev: FormState,
  raw: Record<string, unknown>,
  run: () => Promise<unknown>,
): Promise<FormState> {
  try {
    await run();
  } catch (err) {
    if (err instanceof AdminError) return failure(prev, { [err.field]: err.message }, raw);
    throw err;
  }
  invalidateApps();
  redirect(`/admin/apps/${appId}?saved=1#listing`);
}

export async function addSourceAction(appId: string, prev: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  const raw = formToObject(form, ["url", "field", "checkedAt", "archivedUrl"]);
  const parsed = sourceInput.safeParse(raw);
  if (!parsed.success) return failure(prev, fieldErrors(parsed.error), raw);
  return listingWrite(appId, prev, raw, () => addSource(sql(), actor, appId, parsed.data));
}

export async function deleteSourceAction(appId: string, sourceId: string, prev: FormState): Promise<FormState> {
  const actor = await requireAdmin();
  return listingWrite(appId, prev, {}, () => deleteSource(sql(), actor, appId, sourceId));
}

export async function savePricingAction(
  appId: string,
  planId: string | null,
  prev: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireAdmin();
  const raw = formToObject(form, ["name", "price", "currency", "period", "notes", "sourceId"]);
  const parsed = pricingInput.safeParse(raw);
  if (!parsed.success) return failure(prev, fieldErrors(parsed.error), raw);
  return listingWrite(appId, prev, raw, async () => {
    await savePricingPlan(sql(), actor, appId, planId, parsed.data);
    await recomputeApp(sql(), actor, appId); // data reviews pick up the new price (TASK-020)
  });
}

export async function deletePricingAction(appId: string, planId: string, prev: FormState): Promise<FormState> {
  const actor = await requireAdmin();
  return listingWrite(appId, prev, {}, async () => {
    await deletePricingPlan(sql(), actor, appId, planId);
    await recomputeApp(sql(), actor, appId);
  });
}

export async function saveAffiliateAction(
  appId: string,
  linkId: string | null,
  prev: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireAdmin();
  // The URL is never echoed back to the form, even after a validation error.
  const raw = formToObject(form, ["network", "model", "termsSummary", "url", "sourceId", "active"]);
  const parsed = affiliateInput.safeParse(raw);
  const echo = { ...raw, url: "" };
  if (!parsed.success) return failure(prev, fieldErrors(parsed.error), echo);
  return listingWrite(appId, prev, echo, () => saveAffiliateLink(sql(), actor, appId, linkId, parsed.data));
}

export type ImportState = { seq: number; report?: ImportReport };

export async function importCsvAction(prev: ImportState, form: FormData): Promise<ImportState> {
  const actor = await requireAdmin();
  const file = form.get("file");
  const text = file instanceof File && file.size > 0 ? await file.text() : String(form.get("csv") ?? "");
  const report = await importAppsCsv(sql(), actor, text);
  if (report.created || report.updated) invalidateApps();
  return { seq: prev.seq + 1, report };
}

// ---------- TASK-016: research bundle import + review queue (ADR-030) ----------

export type ResearchState = {
  seq: number;
  seed?: ImportReport;
  facts?: FactsReport;
};

export async function importResearchAction(prev: ResearchState): Promise<ResearchState> {
  const actor = await requireAdmin();
  const { default: bundle } = await import("@/data/research-bundle.json");
  const result = await importResearchBundle(sql(), actor, bundleSchema.parse(bundle));
  invalidateApps();
  return { seq: prev.seq + 1, ...result };
}

/** Owner looked at the app's public gallery/marketing: no minor-coded content → tick + publish (07-LEGAL §2). */
export async function galleryOkPublishAction(id: string, prev: FormState): Promise<FormState> {
  const actor = await requireAdmin();
  try {
    await publishAfterGalleryCheck(sql(), actor, id);
  } catch (err) {
    if (err instanceof AdminError) return failure(prev, { [err.field]: err.message }, {});
    throw err;
  }
  invalidateApps();
  announceApp(id);
  redirect("/admin/research?published=1");
}

export async function rejectFromQueueAction(id: string, prev: FormState, form: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 3) return failure(prev, { reason: "Say why (e.g. minor-coded characters in gallery)" }, {});
  try {
    await setAppStatus(sql(), actor, id, "removed", reason.slice(0, 500));
  } catch (err) {
    if (err instanceof AdminError) return failure(prev, { [err.field]: err.message }, {});
    throw err;
  }
  invalidateApps();
  redirect("/admin/research?removed=1");
}
