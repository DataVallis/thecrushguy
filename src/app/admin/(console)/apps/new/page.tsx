import type { Metadata } from "next";
import { Suspense } from "react";
import { listCategories } from "@/lib/admin/repo";
import { requireAdmin } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import { saveAppAction } from "../../actions";
import { AppForm } from "../../forms";
import { Loading, PageTitle } from "../../ui";

export const metadata: Metadata = { title: "New app" };

export default function NewAppPage() {
  return (
    <>
      <PageTitle>New app</PageTitle>
      <Suspense fallback={<Loading />}>
        <NewApp />
      </Suspense>
    </>
  );
}

async function NewApp() {
  await requireAdmin();
  const categories = await listCategories(sql());
  return (
    <AppForm
      action={saveAppAction.bind(null, null)}
      initial={{ platforms: [], categoryIds: [], hasFreePlan: null }}
      categories={categories}
    />
  );
}
