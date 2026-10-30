"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

type Props = { href: string; icon: React.ReactNode; children: React.ReactNode };

/** Sidebar link; highlighted when the current path is inside its section. The path is request data, so the
 * highlighted version streams in (Suspense) and the static shell shows the plain link. */
export function NavLink(props: Props) {
  return (
    <Suspense fallback={<Item {...props} active={false} />}>
      <ActiveItem {...props} />
    </Suspense>
  );
}

function ActiveItem(props: Props) {
  const path = usePathname();
  const active = props.href === "/admin" ? path === "/admin" : path.startsWith(props.href);
  return <Item {...props} active={active} />;
}

function Item({ href, icon, children, active }: Props & { active: boolean }) {
  return (
    <Link
      href={href as never}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
        active
          ? "bg-coral/15 font-semibold text-[#f7f5fb] ring-1 ring-coral/60"
          : "text-[#b3abc8] hover:bg-[#f7f5fb]/5 hover:text-[#f7f5fb]"
      }`}
    >
      <span aria-hidden className="text-coral">
        {icon}
      </span>
      {children}
    </Link>
  );
}
