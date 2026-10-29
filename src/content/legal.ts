/**
 * Operator facts for the imprint and privacy policy (ADR-007: Data Vallis d.o.o.). Only facts the owner confirmed;
 * `null` = not provided yet → the page says so and stays `noindex` (launch blocker, go-live runbook §0.3).
 * Never fill these from guesses.
 */
export const LEGAL_ENTITY = {
  name: "Data Vallis d.o.o.",
  country: "Slovenia",
  address: null as string | null,
  registrationNo: null as string | null,
  vatId: null as string | null,
  email: "hi@thecrushguy.com",
};

/** Set to true only after the lawyer reviewed privacy + terms (07-LEGAL). Until then those pages are noindex drafts. */
export const LEGAL_TEXTS_REVIEWED = false;

export function missingLegalFacts(): string[] {
  return (["address", "registrationNo", "vatId"] as const).filter((k) => !LEGAL_ENTITY[k]);
}
