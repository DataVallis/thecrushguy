import { isLocale, negotiateLocale } from "@/i18n/config";

/** Paths that are never locale-prefixed. */
const UNLOCALIZED_PREFIXES = ["/api/", "/go/", "/admin", "/_next/"];
const UNLOCALIZED_EXACT = ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/manifest.webmanifest"];

export function needsLocale(pathname: string): boolean {
  if (UNLOCALIZED_EXACT.includes(pathname)) return false;
  if (UNLOCALIZED_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  if (/\.[a-z0-9]+$/i.test(pathname)) return false; // static files in /public
  const first = pathname.split("/")[1] ?? "";
  return !isLocale(first);
}

/** Returns the path to redirect to, or null when the request can pass through. */
export function localeRedirect(pathname: string, acceptLanguage: string | null): string | null {
  if (!needsLocale(pathname)) return null;
  const locale = negotiateLocale(acceptLanguage);
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}
