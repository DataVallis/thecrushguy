// Small presentational helpers shared by admin pages (server components).
export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-6 text-2xl font-bold">{children}</h1>;
}

export function Loading() {
  return <p className="text-sm text-neutral-500">Loading…</p>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-900",
    draft: "bg-neutral-200 text-neutral-800",
    paused: "bg-amber-100 text-amber-900",
    removed: "bg-red-100 text-red-900",
  };
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone[status] ?? ""}`}>{status}</span>;
}

export function fmtDate(d: unknown): string {
  return d instanceof Date ? d.toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—";
}
