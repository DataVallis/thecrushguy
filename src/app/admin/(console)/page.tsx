import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { verificationQueue } from "@/lib/admin/repo";
import { requireAdmin } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import { Loading, PageTitle, StatusBadge, fmtDate } from "./ui";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminHome() {
  return (
    <>
      <PageTitle>Dashboard</PageTitle>
      <Suspense fallback={<Loading />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  const email = await requireAdmin();
  const queue = await verificationQueue(sql());
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm">
        Signed in as <strong>{email}</strong>.
      </p>
      <section>
        <h2 className="mb-2 font-semibold">Verification queue (oldest first)</h2>
        {queue.length === 0 ? (
          <p className="text-sm text-neutral-600">
            No apps yet. <Link href="/admin/apps/new">Add the first one</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded border border-neutral-200 bg-white text-sm">
            {queue.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                <Link href={`/admin/apps/${a.id}`} className="font-medium">
                  {a.name}
                </Link>
                <StatusBadge status={a.status} />
                <span className="ml-auto text-neutral-500">verified: {fmtDate(a.verified_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
