/**
 * "Best for …" labels on list cards — computed from our ranking and sourced facts, never hand-picked.
 * Each label goes to the highest-ranked app that has the fact; #1 already carries "Top pick", and an app
 * gets at most one label. Prices are compared only within one currency (USD).
 */
import type { AppCard } from "./catalog";

export const BEST_FOR = ["free", "voice", "pictures", "memory", "cheap"] as const;
export type BestForKey = (typeof BEST_FOR)[number];

const HAS: Record<Exclude<BestForKey, "cheap">, (a: AppCard) => boolean> = {
  free: (a) => a.hasFreePlan === true,
  voice: (a) => a.features.voice,
  pictures: (a) => a.features.imageGen,
  memory: (a) => a.features.memory,
};

/** `ranked` must be in ranking order (index 0 = top pick). */
export function bestForLabels(ranked: AppCard[]): Record<string, BestForKey> {
  const out: Record<string, BestForKey> = {};
  const free = (a: AppCard, i: number) => i > 0 && !out[a.slug];
  for (const key of BEST_FOR) {
    let pick: AppCard | undefined;
    if (key === "cheap") {
      pick = ranked
        .filter((a, i) => free(a, i) && a.currency === "USD" && a.startingPriceCents !== null)
        .reduce<AppCard | undefined>(
          (m, a) => (!m || a.startingPriceCents! < m.startingPriceCents! ? a : m),
          undefined,
        );
    } else pick = ranked.find((a, i) => free(a, i) && HAS[key](a));
    if (pick) out[pick.slug] = key;
  }
  return out;
}
