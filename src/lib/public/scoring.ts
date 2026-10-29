/**
 * Overall score (01-PRODUCT-SPEC §4): weighted average of the six sub-scores (0–100). Weights are fixed in code
 * for now (admin-configurable weights are a later task). Payouts never enter this function (ADR-005).
 */
export type Scores = Record<"conversation" | "memory" | "customization" | "media" | "value" | "privacy", number | null>;

export const WEIGHTS: Readonly<Record<keyof Scores, number>> = {
  conversation: 25,
  memory: 15,
  customization: 15,
  media: 15,
  value: 20,
  privacy: 10,
};

/**
 * 0–100, rounded to one decimal. Weighted average over the sub-scores that exist: hands-on reviews have all six
 * (ADR-026); data-based reviews leave "conversation" empty, so its weight is spread over the other five (ADR-030).
 */
export function overallScore(s: Scores): number {
  let sum = 0;
  let weight = 0;
  for (const [k, w] of Object.entries(WEIGHTS) as [keyof Scores, number][]) {
    if (s[k] === null) continue;
    sum += s[k] * w;
    weight += w;
  }
  return weight ? Math.round((sum / weight) * 10) / 10 : 0;
}

/** Display on a 0–10 scale with one decimal, e.g. 73.5 → "7.4" (round half up). */
export function toTen(score100: number): string {
  return (Math.round(score100) / 10).toFixed(1);
}

/** 90 days without verification → "being re-checked" badge (01-PRODUCT-SPEC §4). */
export const STALE_AFTER_DAYS = 90;
export function isStale(verifiedAt: Date | null, now = new Date()): boolean {
  if (!verifiedAt) return true;
  return now.getTime() - new Date(verifiedAt).getTime() > STALE_AFTER_DAYS * 86_400_000;
}
