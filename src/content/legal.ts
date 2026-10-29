/**
 * Operator facts for the imprint and privacy policy (ADR-007: Data Vallis d.o.o.). Only facts the owner confirmed;
 * `null` = not provided yet → the page says so and stays `noindex` (launch blocker, go-live runbook §0.3).
 * Never fill these from guesses.
 */
export const LEGAL_ENTITY = {
  // Provided by the owner on 2026-10-29.
  name: "DATA VALLIS d.o.o.",
  country: "Slovenia",
  address: "Ulica Šercerjeve brigade 5, 2000 Maribor" as string | null,
  registrationNo: "8552967000" as string | null,
  vatId: "SI89424999" as string | null,
  email: "hi@thecrushguy.com",
};

/**
 * Privacy + terms are published as final (indexable, no "Draft" note). Owner decision 2026-10-29: no lawyer review
 * (ADR-027). Set to false to turn them back into noindex drafts.
 */
export const LEGAL_TEXTS_REVIEWED = true;

export function missingLegalFacts(): string[] {
  return (["address", "registrationNo", "vatId"] as const).filter((k) => !LEGAL_ENTITY[k]);
}
