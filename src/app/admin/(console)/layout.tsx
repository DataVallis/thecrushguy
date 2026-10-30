import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";

// Navigation is static; every page below checks the session itself with requireAdmin() (ADR-022).
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-neutral-200 bg-white">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3 text-sm">
          <Link href="/admin" className="font-bold">
            Crush Guy admin
          </Link>
          <Link href="/admin/apps">Apps</Link>
          <Link href="/admin/categories">Categories</Link>
          <Link href="/admin/research">Research &amp; queue</Link>
          <Link href="/admin/affiliates">Affiliates</Link>
          <Link href="/admin/import">Import</Link>
          <Link href="/admin/audit">Audit log</Link>
          <form action={logoutAction} className="ml-auto">
            <button type="submit" className="text-neutral-600 underline">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
