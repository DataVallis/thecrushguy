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
