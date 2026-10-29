import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listCategories } from "@/lib/admin/repo";
import { requireAdmin } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import { saveCategoryAction } from "../actions";
import { CategoryForm } from "../forms";
import { Loading, PageTitle } from "../ui";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <>
      <PageTitle>Categories</PageTitle>
      <Suspense fallback={<Loading />}>
        <Categories />
      </Suspense>
    </>
  );
}

async function Categories() {
  await requireAdmin();
  const cats = await listCategories(sql());
  const name = new Map(cats.map((c) => [c.id, c.name]));
  return (
    <div className="flex flex-col gap-8">
      {cats.length === 0 ? (
        <p className="text-sm text-neutral-600">No categories yet.</p>
      ) : (
        <table className="w-full border-collapse bg-white text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Parent</th>
              <th className="p-2">Sort</th>
              <th className="p-2">NSFW</th>
              <th className="p-2">Apps</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-2">
                  <Link href={`/admin/categories/${c.id}`} className="font-medium underline">
                    {c.name}
                  </Link>
                  <span className="ml-2 text-neutral-500">{c.slug}</span>
                </td>
                <td className="p-2">{c.parent_id ? name.get(c.parent_id) : "—"}</td>
                <td className="p-2">{c.sort}</td>
                <td className="p-2">{c.is_nsfw ? "yes" : "no"}</td>
                <td className="p-2">{c.app_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <section>
        <h2 className="mb-3 font-semibold">New category</h2>
        <CategoryForm
          action={saveCategoryAction.bind(null, null)}
          initial={{ sort: "0" }}
          parents={cats}
          submitLabel="Create category"
        />
      </section>
    </div>
  );
}
