import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { logoutAction } from "./actions";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder dashboard — apps/categories admin arrives in TASK-011c.
export default function AdminHome() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Admin</h1>
      <Suspense fallback={<p className="text-sm">Checking session…</p>}>
        <SignedIn />
      </Suspense>
    </>
  );
}

async function SignedIn() {
  const email = await requireAdmin();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Signed in as <strong>{email}</strong>.
      </p>
      <form action={logoutAction}>
        <button type="submit" className="rounded border border-neutral-300 px-3 py-2 text-sm">
          Sign out
        </button>
      </form>
    </div>
  );
}
