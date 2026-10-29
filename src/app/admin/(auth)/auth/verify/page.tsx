import type { Metadata } from "next";
import { Suspense } from "react";
import { verifyLinkAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Confirm sign-in" };

/**
 * GET only renders a button; the token is consumed by the POST (server action). Mail link scanners
 * (e.g. Outlook Safe Links) fetch the URL and would otherwise burn the single-use token (ADR-022).
 */
export default function VerifyPage({ searchParams }: PageProps<"/admin/auth/verify">) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Confirm sign-in</h1>
      <Suspense fallback={null}>
        <ConfirmForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ConfirmForm({ searchParams }: Pick<PageProps<"/admin/auth/verify">, "searchParams">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || token.length === 0)
    return <p className="text-sm">This sign-in link is incomplete. Request a new one.</p>;
  return (
    <form action={verifyLinkAction}>
      <input type="hidden" name="token" value={token} />
      <button type="submit" className="w-full rounded bg-neutral-900 px-3 py-2 font-medium text-white">
        Sign in to admin
      </button>
    </form>
  );
}
