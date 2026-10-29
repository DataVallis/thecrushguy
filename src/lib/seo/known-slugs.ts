/**
 * Published app and category slugs, cached in memory for the proxy's real-404 check (TASK-014). Refreshed every
 * 60 s and immediately after admin saves (`forgetKnownSlugs`). If the database can't be reached the check is
 * skipped (pages then handle unknown slugs themselves) — never block real pages because of a cache problem.
 */
import type postgres from "postgres";

export type KnownSlugs = { apps: Set<string>; categories: Set<string> };
const TTL_MS = 60_000;
let cache: { data: KnownSlugs; at: number } | null = null;
let inflight: Promise<KnownSlugs> | null = null;

export async function loadKnownSlugs(db: postgres.Sql): Promise<KnownSlugs> {
  const [apps, cats] = await Promise.all([
    db<{ slug: string }[]>`select slug from apps where status = 'published'`,
    db<{ slug: string }[]>`select slug from categories`,
  ]);
  return { apps: new Set(apps.map((r) => r.slug)), categories: new Set(cats.map((r) => r.slug)) };
}

export async function knownSlugs(db: () => postgres.Sql, now = Date.now()): Promise<KnownSlugs | null> {
  if (cache && now - cache.at < TTL_MS) return cache.data;
  try {
    inflight ??= loadKnownSlugs(db());
    const data = await inflight;
    cache = { data, at: now };
    return data;
  } catch {
    return null;
  } finally {
    inflight = null;
  }
}

export function forgetKnownSlugs(): void {
  cache = null;
}
