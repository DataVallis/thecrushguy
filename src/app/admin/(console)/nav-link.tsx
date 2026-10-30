"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sidebar link; highlighted when the current path is inside its section. */
export function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
  return (
    <Link
      href={href as never}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
        active
          ? "bg-coral/15 font-semibold text-[#f7f5fb] ring-1 ring-coral/60"
          : "text-[#b3abc8] hover:bg-white/5 hover:text-[#f7f5fb]"
      }`}
    >
      <span aria-hidden className="text-coral">
        {icon}
      </span>
      {children}
    </Link>
  );
}
