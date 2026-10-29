import type { Metadata } from "next";
import "./globals.css";

// Branded 404 for every URL that matches no route, incl. the proxy's rewrites for unknown slugs (TASK-014, ADR-028).
// Rendered outside all layouts, so it carries its own <html>. English: the request's locale isn't known here.
export const metadata: Metadata = { title: "Page not found · The Crush Guy", robots: { index: false } };

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static file, no optimizer needed on a 404 */}
          <img src="/logo.svg" alt="The Crush Guy" width={210} height={36} />
          <h1 className="font-display text-3xl font-extrabold">Page not found</h1>
          <p className="text-muted">This crush ghosted us. Let&apos;s go back to the start.</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload is fine from a 404 */}
          <a href="/en" className="rounded-full bg-ink px-5 py-3 font-semibold text-white">
            Home
          </a>
        </main>
      </body>
    </html>
  );
}
