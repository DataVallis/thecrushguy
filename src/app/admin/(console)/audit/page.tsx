import type { Metadata } from "next";
import { Suspense } from "react";
import { recentAudit } from "@/lib/admin/repo";
import { requireAdmin } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import { Loading, PageTitle, fmtDate } from "../ui";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditPage() {
  return (
    <>
      <PageTitle>Audit log (latest 100)</PageTitle>
      <Suspense fallback={<Loading />}>
        <Audit />
      </Suspense>
    </>
  );
}

async function Audit() {
  await requireAdmin();
  const rows = await recentAudit(sql());
  if (rows.length === 0) return <p className="text-sm text-neutral-600">Nothing yet.</p>;
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {rows.map((r) => (
        <li key={r.id} className="rounded border border-neutral-200 bg-white p-3">
          <div className="flex flex-wrap gap-3">
            <span className="font-medium">{r.action}</span>
            <span>
              {r.entity} {r.entity_id}
            </span>
            <span className="text-neutral-500">{r.actor_email}</span>
            <span className="ml-auto text-neutral-500">{fmtDate(r.at)}</span>
          </div>
          {r.diff ? (
            <pre className="mt-2 overflow-x-auto text-xs text-neutral-700">{JSON.stringify(r.diff, null, 1)}</pre>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
