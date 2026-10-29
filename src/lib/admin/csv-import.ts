/**
 * CSV import of app listings (TASK-011d) — the format TASK-006 will deliver as docs/research/APPS-SEED.csv.
 * Idempotent: rows are matched by slug; a second run with the same file changes nothing and writes no audit rows.
 * Imported apps are always `draft` with an empty compliance checklist — publishing stays a manual decision.
 */
import type postgres from "postgres";
import { z } from "zod";
import { PLATFORMS } from "@/lib/db/platforms";
import { changes } from "./repo";

export const CSV_COLUMNS = [
  "slug",
  "name",
  "website_url",
  "tagline",
  "company_name",
  "company_country",
  "privacy_policy_url",
  "platforms",
  "nsfw_allowed",
  "source_url",
  "source_field",
  "checked_at",
] as const;
export const REQUIRED_COLUMNS = ["slug", "name", "website_url", "source_url", "checked_at"] as const;
export const MAX_ROWS = 1000;
export const MAX_BYTES = 1_000_000;

/** RFC 4180 CSV: commas, double-quoted fields with "" escapes, CRLF or LF. No dependency. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  const src = text.replace(/^﻿/, "");
  while (i < src.length) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else field += c;
      i++;
      continue;
    }
    if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
    i++;
  }
  if (quoted) throw new Error("Unclosed quote in CSV");
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const opt = (s: z.ZodString) =>
  z
    .string()
    .trim()
    .transform((v) => (v ? v : null))
    .pipe(s.nullable());
const url = z.string().refine((v) => /^https?:\/\/\S+$/.test(v) && URL.canParse(v), "http(s) URL");

const rowSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be kebab-case"),
  name: z.string().trim().min(1).max(120),
  website_url: z.string().trim().pipe(url),
  tagline: opt(z.string().max(200)),
  company_name: opt(z.string().max(200)),
  company_country: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => (v ? v : null))
    .pipe(
      z
        .string()
        .regex(/^[A-Z]{2}$/, "country must be ISO-2")
        .nullable(),
    ),
  privacy_policy_url: opt(url),
  platforms: z
    .string()
    .trim()
    .transform((v) =>
      v
        ? v
            .split(/[;|]/)
            .map((p) => p.trim().toLowerCase())
            .filter(Boolean)
        : [],
    )
    .pipe(z.array(z.enum(PLATFORMS))),
  nsfw_allowed: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v === "yes" || v === "true" || v === "1"),
  source_url: z.string().trim().pipe(url),
  source_field: z
    .string()
    .trim()
    .transform((v) => v || "listing basics"),
  checked_at: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "checked_at like 2026-10-29")
    .transform((v) => new Date(`${v}T00:00:00Z`)),
});

export type ImportReport = {
  created: number;
  updated: number;
  unchanged: number;
  sourcesAdded: number;
  errors: string[];
};

export async function importAppsCsv(sql: postgres.Sql, actor: string, text: string): Promise<ImportReport> {
  if (!actor) throw new Error("actor is required");
  const report: ImportReport = { created: 0, updated: 0, unchanged: 0, sourcesAdded: 0, errors: [] };
  if (Buffer.byteLength(text, "utf8") > MAX_BYTES) return { ...report, errors: ["File is larger than 1 MB"] };
  let rows: string[][];
  try {
    rows = parseCsv(text);
  } catch (e) {
    return { ...report, errors: [(e as Error).message] };
  }
  const [header, ...data] = rows;
  if (!header) return { ...report, errors: ["The file is empty"] };
  const cols = header.map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !cols.includes(c));
  if (missing.length) return { ...report, errors: [`Missing columns: ${missing.join(", ")}`] };
  if (data.length > MAX_ROWS) return { ...report, errors: [`More than ${MAX_ROWS} rows`] };

  // Validate everything first; import nothing if any row is invalid (all-or-nothing, easy to fix and re-run).
  const parsed: z.output<typeof rowSchema>[] = [];
  const seen = new Set<string>();
  data.forEach((cells, i) => {
    const obj: Record<string, string> = {};
    for (const c of CSV_COLUMNS) {
      const idx = cols.indexOf(c);
      obj[c] = idx >= 0 ? (cells[idx] ?? "") : "";
    }
    const r = rowSchema.safeParse(obj);
    const line = i + 2;
    if (!r.success)
      report.errors.push(`Line ${line}: ${r.error.issues.map((x) => `${String(x.path[0])}: ${x.message}`).join("; ")}`);
    else if (seen.has(r.data.slug)) report.errors.push(`Line ${line}: duplicate slug ${r.data.slug}`);
    else {
      seen.add(r.data.slug);
      parsed.push(r.data);
    }
  });
  if (report.errors.length) return report;

  await sql.begin(async (tx) => {
    for (const r of parsed) {
      const cols = {
        name: r.name,
        website_url: r.website_url,
        tagline: r.tagline,
        company_name: r.company_name,
        company_country: r.company_country,
        privacy_policy_url: r.privacy_policy_url,
        platforms: r.platforms,
        nsfw_allowed: r.nsfw_allowed,
      };
      const [before] = await tx`select * from apps where slug = ${r.slug} for update`;
      let appId: string;
      if (!before) {
        const [ins] = await tx<{ id: string }[]>`insert into apps ${tx({ slug: r.slug, ...cols })} returning id`;
        appId = ins!.id;
        report.created++;
        await tx`insert into audit_log (actor_email, action, entity, entity_id, diff)
          values (${actor}, 'import', 'app', ${appId}, ${tx.json(JSON.parse(JSON.stringify({ slug: r.slug, ...cols })))})`;
      } else {
        appId = before.id as string;
        const diff = changes(before, cols);
        if (Object.keys(diff).length) {
          await tx`update apps set ${tx(cols)} where id = ${appId}`;
          report.updated++;
          await tx`insert into audit_log (actor_email, action, entity, entity_id, diff)
            values (${actor}, 'import', 'app', ${appId}, ${tx.json(JSON.parse(JSON.stringify(diff)))})`;
        } else report.unchanged++;
      }
      const [src] =
        await tx`select 1 from sources where app_id = ${appId} and url = ${r.source_url} and field = ${r.source_field}`;
      if (!src) {
        const srcRow = { app_id: appId, url: r.source_url, field: r.source_field, checked_at: r.checked_at };
        const [s] = await tx<{ id: string }[]>`insert into sources ${tx(srcRow)} returning id`;
        await tx`insert into audit_log (actor_email, action, entity, entity_id, diff)
          values (${actor}, 'import', 'source', ${s!.id}, ${tx.json(JSON.parse(JSON.stringify(srcRow)))})`;
        report.sourcesAdded++;
      }
    }
  });
  return report;
}
