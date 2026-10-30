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
      <body className="admin min-h-dvh antialiased">{children}</body>
    </html>
  );
}
