import { INFO_PAGES } from "@/content/info-page-names";
import { isLocale } from "@/i18n/config";
import type { KnownSlugs } from "./known-slugs";

/**
 * Real 404s (TASK-014): pages stream, so a `notFound()` inside them can only render the not-found UI with status 200.
 * The proxy therefore decides up front and rewrites unknown URLs to a path that matches no route, which Next
 * answers with `app/global-not-found.tsx` and HTTP 404. Returns the rewrite path, or null to pass through.
 * `known` = null (DB unavailable) → only the static check for info pages is applied.
 */
/** Matches no route (4 segments under the locale; keeps the locale so the locale redirect leaves it alone) →
 * global-not-found with status 404. */
export const notFoundPath = (locale: string) => `/${locale}/__nf/no/route`;

export function notFoundRewrite(pathname: string, known: KnownSlugs | null): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const [locale, section, slug, ...rest] = parts;
  if (!locale || !isLocale(locale) || !section) return null;
  const target = notFoundPath(locale);
  if (parts.length === 2) return (INFO_PAGES as readonly string[]).includes(section) ? null : target;
  if ((section === "app" || section === "category") && slug !== undefined && rest.length === 0) {
    if (!known) return null;
    const set = section === "app" ? known.apps : known.categories;
    return set.has(decodeURIComponent(slug)) ? null : target;
  }
  return null; // deeper unknown paths match no route → global 404 anyway
}

/** Only these paths need the database-backed slug list. */
export function needsSlugCheck(pathname: string): boolean {
  return /^\/[a-z]{2}\/(app|category)\/[^/]+\/?$/.test(pathname);
}
