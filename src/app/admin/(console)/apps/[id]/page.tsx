import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getApp, listCategories } from "@/lib/admin/repo";
import { rowToValues } from "@/lib/admin/values";
import { requireAdmin } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import { markVerifiedAction, saveAppAction, setStatusAction } from "../../actions";
import { AppForm, StatusForm } from "../../forms";
import { Loading, PageTitle, StatusBadge, fmtDate } from "../../ui";
import { Listing } from "./listing";

export const metadata: Metadata = { title: "Edit app" };

export default function EditAppPage({ params, searchParams }: PageProps<"/admin/apps/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditApp params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditApp({ params, searchParams }: PageProps<"/admin/apps/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { saved } = await searchParams;
  const [app, categories] = await Promise.all([getApp(sql(), id), listCategories(sql())]);
  if (!app) notFound();
  const values = rowToValues(app);
  const canPublish = Boolean(
    app.chk_18plus_terms &&
    app.chk_no_minor_content &&
    app.chk_no_deepfake_feature &&
    app.chk_privacy_policy &&
    app.chk_operator_identifiable &&
    app.checklist_checked_at,
  );
  return (
    <>
      <PageTitle>
        {app.name} <StatusBadge status={app.status} />
      </PageTitle>
      {saved === "1" ? (
        <p role="status" className="mb-4 rounded bg-emerald-50 p-3 text-sm">
          Saved.
        </p>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
        <AppForm action={saveAppAction.bind(null, app.id)} initial={values} categories={categories} />
        <aside className="flex flex-col gap-6">
          <StatusForm
            action={setStatusAction.bind(null, app.id)}
            status={app.status}
            removalReason={(app.removal_reason as string | null) ?? null}
            canPublish={canPublish}
          />
          <div className="flex flex-col gap-2 text-sm">
            <span>Checklist confirmed: {fmtDate(app.checklist_checked_at)}</span>
            <span>Last verified: {fmtDate(app.verified_at)}</span>
            <form action={markVerifiedAction.bind(null, app.id)}>
              <button type="submit" className="rounded border border-neutral-400 px-3 py-1.5">
                Mark verified now
              </button>
            </form>
          </div>
        </aside>
      </div>
      <Listing appId={app.id} />
    </>
  );
}
