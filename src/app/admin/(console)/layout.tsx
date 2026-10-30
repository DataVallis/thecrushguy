import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { NavLink } from "./nav-link";

// Simple stroke icons (24px grid), currentColor.
const I = (d: string) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);
const ICONS = {
  home: I("M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"),
  apps: I("M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"),
  cats: I("M4 6h16M4 12h10M4 18h6"),
  research: I("M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5"),
  money: I("M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6"),
  import: I("M12 3v12M7 10l5 5 5-5M4 21h16"),
  audit: I("M9 4h6l1 2h3v15H5V6h3zM9 12h6M9 16h4"),
};

const GROUPS: { title: string; links: [string, keyof typeof ICONS, string][] }[] = [
  { title: "", links: [["/admin", "home", "Overview"]] },
  {
    title: "Work",
    links: [
      ["/admin/research", "research", "Research & queue"],
      ["/admin/affiliates", "money", "Affiliates"],
    ],
  },
  {
    title: "Catalog",
    links: [
      ["/admin/apps", "apps", "Apps"],
      ["/admin/categories", "cats", "Categories"],
      ["/admin/import", "import", "Import"],
    ],
  },
  { title: "System", links: [["/admin/audit", "audit", "Audit log"]] },
];

// Navigation is static; every page below checks the session itself with requireAdmin() (ADR-022).
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:grid md:min-h-dvh md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-white/10 bg-[#0d0a18] md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:border-r md:border-b-0">
        <Link href="/admin" className="flex items-center gap-2 px-4 pt-4 pb-3 md:px-5 md:pt-5">
          <Image src="/icon.svg" alt="" width={26} height={26} unoptimized />
          <span className="font-display text-lg leading-none font-extrabold text-[#f7f5fb]">
            the<span className="text-coral">crush</span>guy
          </span>
          <span className="rounded bg-coral/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-coral uppercase">
            admin
          </span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:gap-0 md:overflow-visible md:pb-0">
          {GROUPS.map((g) => (
            <div key={g.title || "top"} className="flex gap-1 md:mt-4 md:flex-col md:gap-0.5">
              {g.title ? (
                <p className="hidden px-3 pb-1 text-[11px] font-semibold tracking-wider text-[#7d7499] uppercase md:block">
                  {g.title}
                </p>
              ) : null}
              {g.links.map(([href, icon, label]) => (
                <NavLink key={href} href={href} icon={ICONS[icon]}>
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
          <form action={logoutAction} className="md:hidden">
            <button type="submit" className="px-3 py-2 text-sm whitespace-nowrap text-[#b3abc8]">
              Sign out
            </button>
          </form>
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 text-sm md:block">
          <a href="/en" target="_blank" className="block text-[#b3abc8] hover:text-[#f7f5fb]">
            View site ↗
          </a>
          <form action={logoutAction} className="mt-2">
            <button type="submit" className="text-[#b3abc8] hover:text-[#f7f5fb]">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 md:px-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
