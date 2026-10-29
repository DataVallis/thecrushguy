import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl font-extrabold">Page not found</h1>
      <p className="text-muted">This crush ghosted us. Let&apos;s go back to the start.</p>
      <Link href="/en" className="rounded-full bg-ink px-5 py-3 font-semibold text-white">
        Home
      </Link>
    </main>
  );
}
