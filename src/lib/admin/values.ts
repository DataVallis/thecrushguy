/** DB row (snake_case) → form values (camelCase field names used by the admin forms and zod schemas). */
const snakeToCamel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

export function rowToValues(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[snakeToCamel(k)] = v;
  // Special cases: column names that don't camelCase 1:1 to the form names, and money shown in major units.
  if ("chk_18plus_terms" in row) out.chk18PlusTerms = row.chk_18plus_terms;
  for (const k of ["pros", "cons", "best_for"] as const)
    if (Array.isArray(row[k])) out[snakeToCamel(k)] = (row[k] as string[]).join("\n");
  if (typeof row.starting_price_cents === "number")
    out.startingPriceCents = (row.starting_price_cents / 100).toFixed(2);
  return out;
}
