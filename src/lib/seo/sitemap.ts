/** Sitemaps (TASK-014): an index + one file per published locale and type, max 10k URLs each (02-ARCHITECTURE). */
import type postgres from "postgres";
import { INFO, INFO_PAGES } from "@/content/info-pages";
import { publishedLocales, type Locale } from "@/i18n/config";

export const SITEMAP_TYPES = ["pages", "categories", "apps"] as const;
export type SitemapType = (typeof SITEMAP_TYPES)[number];
export const MAX_URLS = 10_000;

export type Entry = { loc: string; lastmod?: Date };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function urlsetXml(entries: Entry[]): string {
  const body = entries
    .slice(0, MAX_URLS)
    .map(
      (e) => `<url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod.toISOString()}</lastmod>` : ""}</url>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function indexXml(site: string): string {
  const items = publishedLocales.flatMap((l) =>
    SITEMAP_TYPES.map((t) => `<sitemap><loc>${esc(`${site}/sitemaps/${l}-${t}.xml`)}</loc></sitemap>`),
  );
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.join("")}</sitemapindex>`;
}

export function parseSitemapName(name: string): { locale: Locale; type: SitemapType } | null {
  const m = /^([a-z]{2})-(pages|categories|apps)\.xml$/.exec(name);
  if (!m) return null;
  const locale = m[1] as Locale;
  if (!publishedLocales.includes(locale)) return null;
  return { locale, type: m[2] as SitemapType };
}

/** Only indexable URLs: published apps, non-empty SFW categories, indexable info pages. */
export async function sitemapEntries(
  db: postgres.Sql,
  site: string,
  locale: Locale,
  type: SitemapType,
): Promise<Entry[]> {
  if (type === "pages")
    return [
      { loc: `${site}/${locale}` },
      ...INFO_PAGES.filter((p) => INFO[p].indexable).map((p) => ({ loc: `${site}/${locale}/${p}` })),
    ];
  if (type === "categories") {
    const rows = await db<{ slug: string; lastmod: Date }[]>`
      select c.slug, greatest(c.updated_at, max(a.updated_at)) as lastmod from categories c
      join app_categories ac on ac.category_id = c.id join apps a on a.id = ac.app_id and a.status = 'published'
      where not c.is_nsfw group by c.id order by c.slug limit ${MAX_URLS}`;
    return rows.map((r) => ({ loc: `${site}/${locale}/category/${r.slug}`, lastmod: r.lastmod }));
  }
  const rows = await db<{ slug: string; updated_at: Date }[]>`
    select slug, updated_at from apps where status = 'published' order by slug limit ${MAX_URLS}`;
  return rows.map((r) => ({ loc: `${site}/${locale}/app/${r.slug}`, lastmod: r.updated_at }));
}
