import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listApps } from "@/lib/admin/repo";
import { requireAdmin } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import { Loading, PageTitle, StatusBadge, fmtDate } from "../ui";

export const metadata: Metadata = { title: "Apps" };

export default function AppsPage() {
  return (
    <>
      <div className="flex items-center">
        <PageTitle>Apps</PageTitle>
        <Link href="/admin/apps/new" className="mb-6 ml-auto rounded bg-neutral-900 px-3 py-1.5 text-sm text-white">
          New app
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <AppsTable />
      </Suspense>
    </>
  );
}

async function AppsTable() {
  await requireAdmin();
  const apps = await listApps(sql());
  if (apps.length === 0) return <p className="text-sm text-neutral-600">No apps yet.</p>;
  return (
    <table className="w-full border-collapse bg-white text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="p-2">Name</th>
          <th className="p-2">Status</th>
          <th className="p-2">Checklist</th>
          <th className="p-2">Verified</th>
          <th className="p-2">Updated</th>
        </tr>
      </thead>
      <tbody>
        {apps.map((a) => (
          <tr key={a.id} className="border-b">
            <td className="p-2">
              <Link href={`/admin/apps/${a.id}`} className="font-medium underline">
                {a.name}
              </Link>
              <span className="ml-2 text-neutral-500">{a.slug}</span>
            </td>
            <td className="p-2">
              <StatusBadge status={a.status} />
            </td>
            <td className="p-2">{a.checklist_complete ? "complete" : "incomplete"}</td>
            <td className="p-2">{fmtDate(a.verified_at)}</td>
            <td className="p-2">{fmtDate(a.updated_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
