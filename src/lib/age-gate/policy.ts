/**
 * Age gate policy (TASK-015, ADR-006, ADR-025). Pure functions — no Next.js imports.
 *
 * Decision for an NSFW section:
 *  - "blocked": visitor's region is on the restricted list, or the region is unknown → NSFW hidden (geo rule (a),
 *    07-LEGAL §3, until the lawyer answers). Fail closed: no trustworthy location = restricted.
 *  - "gate":    allowed region, provider has not verified the visitor → show the SFW gate.
 *  - "show":    allowed region and verified.
 * SFW pages never call this.
 */
export type GateDecision = "show" | "gate" | "blocked";

export type Region = { country: string | null; subdivision: string | null };

/** Provider interface — self-declaration now; a third-party age-verification provider later (07-LEGAL §3 option b). */
export interface AgeVerificationProvider {
  readonly id: string;
  isVerified(cookie: (name: string) => string | undefined): boolean;
}

export const AGE_COOKIE = "age_ok";
export const AGE_COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60;

export const selfDeclaration: AgeVerificationProvider = {
  id: "self-declaration",
  isVerified: (cookie) => cookie(AGE_COOKIE) === "1",
};

/**
 * Restricted regions while 07-LEGAL §3 is open: whole countries ("GB") or subdivisions ("US-TX").
 * Conservative default; the owner/lawyer narrows it via AGE_GATE_RESTRICTED_REGIONS (ADR-025).
 */
export const DEFAULT_RESTRICTED = ["GB", "US", "FR", "DE", "IT", "AU"] as const;

export function restrictedRegions(raw = process.env.AGE_GATE_RESTRICTED_REGIONS): Set<string> {
  if (raw === undefined || raw.trim() === "") return new Set(DEFAULT_RESTRICTED);
  return new Set(
    raw
      .split(",")
      .map((r) => r.trim().toUpperCase())
      .filter((r) => /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/.test(r)),
  );
}

export function regionFromHeaders(get: (name: string) => string | null): Region {
  const c = (get("cf-ipcountry") ?? "").toUpperCase();
  const s = (get("cf-region-code") ?? "").toUpperCase();
  return {
    country: /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1" ? c : null,
    subdivision: /^[A-Z0-9]{1,3}$/.test(s) ? s : null,
  };
}

export function gateDecision(
  region: Region,
  verified: boolean,
  restricted: Set<string> = restrictedRegions(),
): GateDecision {
  if (!region.country) return "blocked";
  if (restricted.has(region.country)) return "blocked";
  if (region.subdivision && restricted.has(`${region.country}-${region.subdivision}`)) return "blocked";
  return verified ? "show" : "gate";
}

/** Where to send the visitor after confirming: a local path only (no open redirect). */
export function safeReturnPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string" || raw.length > 500) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /[\r\n]/.test(raw)) return fallback;
  return raw;
}
