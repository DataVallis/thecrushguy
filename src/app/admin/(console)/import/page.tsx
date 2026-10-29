import type { Metadata } from "next";
import { Suspense } from "react";
import { CSV_COLUMNS, REQUIRED_COLUMNS } from "@/lib/admin/csv-import";
import { requireAdmin } from "@/lib/auth/session";
import { importCsvAction } from "../actions";
import { ImportForm } from "../listing-forms";
import { Loading, PageTitle } from "../ui";

export const metadata: Metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <>
      <PageTitle>Import apps (CSV)</PageTitle>
      <Suspense fallback={<Loading />}>
        <Import />
      </Suspense>
    </>
  );
}

async function Import() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p>
        Columns: <code>{CSV_COLUMNS.join(",")}</code>. Required: <code>{REQUIRED_COLUMNS.join(", ")}</code>. Platforms
        separated by <code>;</code>, dates as <code>YYYY-MM-DD</code>.
      </p>
      <p>
        Rows match existing apps by slug. New apps are created as <strong>draft</strong> with an empty checklist; status
        and checklist of existing apps are never changed. One invalid row → nothing is imported. Re-running the same
        file changes nothing.
      </p>
      <ImportForm action={importCsvAction} />
    </div>
  );
}
