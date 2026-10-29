/** Info page names — own module so the proxy can import it without the page content (React). */
export const INFO_PAGES = [
  "about",
  "how-we-rank",
  "affiliate-disclosure",
  "privacy",
  "terms",
  "imprint",
  "contact",
] as const;
export type InfoPage = (typeof INFO_PAGES)[number];
