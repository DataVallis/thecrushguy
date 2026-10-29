import "server-only";
import type { Locale } from "./config";
import en from "./messages/en.json";

export type Dictionary = typeof en;

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: async () => en,
  de: async () => (await import("./messages/de.json")).default,
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}
