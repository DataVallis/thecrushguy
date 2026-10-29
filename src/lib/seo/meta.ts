/**
 * SEO helpers (TASK-014, 02-ARCHITECTURE "Programmatic SEO", ADR-012/016 quality bar).
 * Only published locales get hreflang alternates; x-default points to the default locale.
 */
import type { Metadata } from "next";
import { defaultLocale, publishedLocales, type Locale } from "@/i18n/config";

/** `path` without locale, starting with "/" ("" for the locale home). */
export function alternatesFor(locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of publishedLocales) languages[l] = `/${l}${path}`;
  if (publishedLocales.length) languages["x-default"] = `/${defaultLocale}${path}`;
  return { canonical: `/${locale}${path}`, languages };
}

/** Titles ≤ 60 and descriptions ≤ 155 characters (06-SEO-CONTENT checklist); cut at a word boundary with "…". */
export function clamp(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, "")}…`;
}

export const TITLE_MAX = 60 - " · The Crush Guy".length; // the layout template appends the brand
export const DESCRIPTION_MAX = 155;
