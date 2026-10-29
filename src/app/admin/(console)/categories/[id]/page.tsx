import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCategory, listCategories } from "@/lib/admin/repo";
import { rowToValues } from "@/lib/admin/values";
import { requireAdmin } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import { saveCategoryAction } from "../../actions";
import { CategoryForm } from "../../forms";
import { Loading, PageTitle } from "../../ui";

export const metadata: Metadata = { title: "Edit category" };

export default function EditCategoryPage({ params }: PageProps<"/admin/categories/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditCategory params={params} />
    </Suspense>
  );
}

async function EditCategory({ params }: Pick<PageProps<"/admin/categories/[id]">, "params">) {
  await requireAdmin();
  const { id } = await params;
  const cat = await getCategory(sql(), id);
  if (!cat) notFound();
  const parents = (await listCategories(sql())).filter((c) => c.id !== cat.id);
  return (
    <>
      <PageTitle>{cat.name}</PageTitle>
      <CategoryForm
        action={saveCategoryAction.bind(null, cat.id)}
        initial={rowToValues(cat)}
        parents={parents}
        submitLabel="Save"
      />
    </>
  );
}
