import type { Metadata } from "next";
import "../globals.css";

// Separate root layout: /admin is not localized (ADR-012) and is English-only (ADR-022).
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · The Crush Guy admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
