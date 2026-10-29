import type { Metadata } from "next";
import { Suspense } from "react";
import { requestLinkAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Sign in</h1>
      <Suspense fallback={null}>
        <Notice searchParams={searchParams} />
      </Suspense>
      <form action={requestLinkAction} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          className="rounded border border-neutral-300 px-3 py-2"
        />
        <button type="submit" className="rounded bg-neutral-900 px-3 py-2 font-medium text-white">
          Email me a sign-in link
        </button>
      </form>
    </>
  );
}

async function Notice({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const sp = await searchParams;
  if (sp.sent === "1")
    return (
      <p role="status" className="mb-4 rounded bg-emerald-50 p-3 text-sm">
        If this address is allowed, a sign-in link is on its way. It works once and expires in 15 minutes.
      </p>
    );
  if (sp.error === "link")
    return (
      <p role="alert" className="mb-4 rounded bg-amber-50 p-3 text-sm">
        That link is invalid, already used or expired. Request a new one.
      </p>
    );
  return null;
}
