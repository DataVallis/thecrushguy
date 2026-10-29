"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  AdminError,
  createApp,
  createCategory,
  markVerified,
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
function invalidateApps(slug?: string) {
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
  invalidateApps(parsed.data.slug);
  updateTag("categories");
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
  return listingWrite(appId, prev, raw, () => savePricingPlan(sql(), actor, appId, planId, parsed.data));
}

export async function deletePricingAction(appId: string, planId: string, prev: FormState): Promise<FormState> {
  const actor = await requireAdmin();
  return listingWrite(appId, prev, {}, () => deletePricingPlan(sql(), actor, appId, planId));
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
