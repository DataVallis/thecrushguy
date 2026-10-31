/**
 * Sources, pricing plans and affiliate links (TASK-011d). Same rules as repo.ts: one transaction per write
 * with its audit row; actor from the session. Affiliate URLs are encrypted before they reach the database and
 * are never returned to the UI (only the host hint) — CLAUDE.md hard rule.
 */
import type postgres from "postgres";
import { z } from "zod";
import { encryptLink, linkHint, linkKey } from "@/lib/crypto/link-cipher";
import { AdminError, assertPublishable, changes } from "./repo";
import { priceToCents } from "./validation";

type Tx = postgres.TransactionSql;

async function audit(tx: Tx, actor: string, action: string, entity: string, id: string, diff: unknown) {
  if (!actor) throw new Error("audit: actor is required");
  await tx`insert into audit_log (actor_email, action, entity, entity_id, diff)
    values (${actor}, ${action}, ${entity}, ${id}, ${tx.json(JSON.parse(JSON.stringify(diff ?? null)))})`;
}

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => /^https?:\/\/[^\s]+$/.test(v) && URL.canParse(v), "Must be an http(s) URL");

// ---------- sources ----------

export const sourceInput = z.object({
  url: httpUrl,
  field: z.string().trim().min(1, "What does this source support? e.g. pricing").max(200),
  checkedAt: z
    .string()
    .trim()
    .nullish()
    .transform((v, ctx) => {
      if (!v) return new Date();
      const d = new Date(`${v}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: "custom", message: "Date like 2026-10-29" });
        return z.NEVER;
      }
      return d;
    }),
  archivedUrl: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null))
    .pipe(httpUrl.nullable()),
});
export type SourceInput = z.output<typeof sourceInput>;

export async function addSource(sql: postgres.Sql, actor: string, appId: string, s: SourceInput): Promise<string> {
  return sql.begin(async (tx) => {
    const [app] = await tx`select 1 from apps where id = ${appId}`;
    if (!app) throw new AdminError("_form", "App not found");
    const row = { app_id: appId, url: s.url, field: s.field, checked_at: s.checkedAt, archived_url: s.archivedUrl };
    const [r] = await tx<{ id: string }[]>`insert into sources ${tx(row)} returning id`;
    await audit(tx, actor, "create", "source", r!.id, row);
    return r!.id;
  });
}

export async function deleteSource(sql: postgres.Sql, actor: string, appId: string, id: string): Promise<void> {
  try {
    await sql.begin(async (tx) => {
      const [before] = await tx`delete from sources where id = ${id} and app_id = ${appId} returning *`;
      if (!before) throw new AdminError("_form", "Source not found");
      await audit(tx, actor, "delete", "source", id, before);
    });
  } catch (err) {
    if ((err as { code?: string }).code === "23503")
      throw new AdminError("_form", "This source backs a price — change or delete that price first");
    throw err;
  }
}

// ---------- pricing plans ----------

export const pricingInput = z.object({
  name: z.string().trim().min(1).max(120),
  price: priceToCents.pipe(z.number({ message: "Price is required" })),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "ISO code like EUR"),
  period: z.enum(["month", "year", "lifetime", "credits"]),
  notes: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v ? v : null)),
  sourceId: z.uuid("Every price needs a source"),
});
export type PricingInput = z.output<typeof pricingInput>;

/** The source must belong to the same app — otherwise a price could cite another app's page. */
async function assertSourceOfApp(tx: Tx, appId: string, sourceId: string | null) {
  if (!sourceId) return;
  const [ok] = await tx`select 1 from sources where id = ${sourceId} and app_id = ${appId}`;
  if (!ok) throw new AdminError("sourceId", "Pick a source of this app");
}

export async function savePricingPlan(
  sql: postgres.Sql,
  actor: string,
  appId: string,
  id: string | null,
  p: PricingInput,
): Promise<string> {
  return sql.begin(async (tx) => {
    await assertSourceOfApp(tx, appId, p.sourceId);
    const row = {
      name: p.name,
      price_cents: p.price,
      currency: p.currency,
      period: p.period,
      notes: p.notes,
      source_id: p.sourceId,
    };
    if (!id) {
      const [r] = await tx<{ id: string }[]>`insert into pricing_plans ${tx({ ...row, app_id: appId })} returning id`;
      await audit(tx, actor, "create", "pricing_plan", r!.id, row);
      return r!.id;
    }
    const [before] = await tx`select * from pricing_plans where id = ${id} and app_id = ${appId} for update`;
    if (!before) throw new AdminError("_form", "Price not found");
    await tx`update pricing_plans set ${tx(row)} where id = ${id}`;
    const diff = changes(before, row);
    if (Object.keys(diff).length) await audit(tx, actor, "update", "pricing_plan", id, diff);
    return id;
  });
}

export async function deletePricingPlan(sql: postgres.Sql, actor: string, appId: string, id: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [before] = await tx`delete from pricing_plans where id = ${id} and app_id = ${appId} returning *`;
    if (!before) throw new AdminError("_form", "Price not found");
    const [app] = await tx<{ status: string }[]>`select status from apps where id = ${appId}`;
    if (app?.status === "published") await assertPublishable(tx, appId);
    await audit(tx, actor, "delete", "pricing_plan", id, before);
  });
}

// ---------- affiliate links ----------

export const affiliateInput = z.object({
  network: z.enum(["direct", "crakrevenue", "other"]),
  model: z.enum(["revshare", "cpa", "pps", "hybrid"]),
  termsSummary: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => (v ? v : null)),
  /** Only https affiliate targets. Blank on edit = keep the stored URL. */
  url: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null))
    .pipe(
      z
        .string()
        .max(2000)
        .refine((v) => /^https:\/\/[^\s]+$/.test(v) && URL.canParse(v), "Must be an https URL")
        .nullable(),
    ),
  sourceId: z
    .string()
    .nullish()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
  active: z.boolean(),
  /** "US, GB ca" → ["US","GB","CA"]; blank = all countries. */
  countries: z
    .string()
    .nullish()
    .transform((v, ctx) => {
      const list = [
        ...new Set(
          (v ?? "")
            .toUpperCase()
            .split(/[\s,;]+/)
            .filter(Boolean),
        ),
      ];
      const bad = list.filter((c) => !/^[A-Z]{2}$/.test(c));
      if (bad.length) ctx.addIssue({ code: "custom", message: `Not a 2-letter country code: ${bad.join(", ")}` });
      return list.length ? list.sort() : null;
    }),
});
export type AffiliateInput = z.output<typeof affiliateInput>;

/**
 * Creates or updates a link. Activating one link deactivates the app's other links in the same transaction
 * (the DB allows only one active link per app). The audit diff never contains the URL or ciphertext — only
 * the host hint and whether the URL changed.
 */
export async function saveAffiliateLink(
  sql: postgres.Sql,
  actor: string,
  appId: string,
  id: string | null,
  a: AffiliateInput,
  key?: Buffer,
): Promise<string> {
  if (!id && !a.url) throw new AdminError("url", "The affiliate URL is required");
  let encrypted: { url_encrypted: string; url_hint: string } | null = null;
  if (a.url) {
    let k: Buffer;
    try {
      k = key ?? linkKey();
    } catch {
      throw new AdminError("url", "LINK_ENCRYPTION_KEY is not configured on this server — the link was not saved");
    }
    encrypted = { url_encrypted: encryptLink(a.url, k), url_hint: linkHint(a.url) };
  }
  return sql.begin(async (tx) => {
    const [app] = await tx`select 1 from apps where id = ${appId} for update`;
    if (!app) throw new AdminError("_form", "App not found");
    await assertSourceOfApp(tx, appId, a.sourceId);
    const row = {
      network: a.network,
      model: a.model,
      terms_summary: a.termsSummary,
      source_id: a.sourceId,
      active: a.active,
      countries: a.countries,
      ...(encrypted ?? {}),
    };
    const safe = (r: Record<string, unknown>) => {
      const { url_encrypted, ...rest } = r;
      return { ...rest, url_changed: url_encrypted !== undefined };
    };
    if (a.active)
      await tx`update affiliate_links set active = false where app_id = ${appId} and active and id is distinct from ${id}`;
    if (!id) {
      const [r] = await tx<{ id: string }[]>`insert into affiliate_links ${tx({ ...row, app_id: appId })} returning id`;
      await audit(tx, actor, "create", "affiliate_link", r!.id, safe(row));
      return r!.id;
    }
    const [before] = await tx`select * from affiliate_links where id = ${id} and app_id = ${appId} for update`;
    if (!before) throw new AdminError("_form", "Link not found");
    await tx`update affiliate_links set ${tx(row)} where id = ${id}`;
    const { url_encrypted: _old, ...beforeSafe } = before;
    void _old;
    const diff = changes(beforeSafe, safe(row));
    delete diff.url_changed;
    if (encrypted) diff.url = "replaced";
    if (Object.keys(diff).length) await audit(tx, actor, "update", "affiliate_link", id, diff);
    return id;
  });
}

// ---------- reads for the app page ----------

export async function listingFor(sql: postgres.Sql, appId: string) {
  const [srcs, plans, links] = await Promise.all([
    sql<{ id: string; url: string; field: string; checked_at: Date; archived_url: string | null }[]>`
      select id, url, field, checked_at, archived_url from sources where app_id = ${appId} order by checked_at desc, url`,
    sql<
      {
        id: string;
        name: string;
        price_cents: number;
        currency: string;
        period: string;
        notes: string | null;
        source_id: string;
      }[]
    >`select id, name, price_cents, currency, period, notes, source_id from pricing_plans
      where app_id = ${appId} order by price_cents, name`,
    // Never select url_encrypted for display.
    sql<
      {
        id: string;
        network: string;
        model: string;
        terms_summary: string | null;
        url_hint: string;
        active: boolean;
        source_id: string | null;
        countries: string[] | null;
      }[]
    >`select id, network, model, terms_summary, url_hint, active, source_id, countries from affiliate_links
      where app_id = ${appId} order by active desc, created_at`,
  ]);
  return { sources: srcs, plans, links };
}

/**
 * Sets the accepted countries of an app's active affiliate link (no URL involved — safe for the MCP agent).
 * `raw` like "US, GB, CA"; empty = all countries. Returns the stored list.
 */
export async function setLinkCountries(
  sql: postgres.Sql,
  actor: string,
  slug: string,
  raw: string,
): Promise<{ countries: string[] | null; url_hint: string }> {
  const parsed = affiliateInput.shape.countries.safeParse(raw);
  if (!parsed.success) throw new AdminError("countries", parsed.error.issues.map((i) => i.message).join("; "));
  const countries = parsed.data ?? null;
  return sql.begin(async (tx) => {
    const [l] = await tx<{ id: string; countries: string[] | null; url_hint: string }[]>`
      select l.id, l.countries, l.url_hint from affiliate_links l join apps a on a.id = l.app_id
      where a.slug = ${slug} and l.active for update of l`;
    if (!l)
      throw new AdminError("slug", `No active affiliate link for ${slug} — the owner adds the link in /admin first`);
    await tx`update affiliate_links set countries = ${countries} where id = ${l.id}`;
    await audit(tx, actor, "update", "affiliate_link", l.id, { countries: [l.countries, countries] });
    return { countries, url_hint: l.url_hint };
  });
}

/**
 * MCP (ADR-037): store a tracking link the owner sent the agent in chat. Replaces the app's active link
 * (encrypted like the admin form). Returns only the host hint — the URL is never echoed back.
 */
export async function setAffiliateLinkBySlug(
  sql: postgres.Sql,
  actor: string,
  slug: string,
  raw: { network: string; model: string; url: string; termsSummary?: string; countries?: string },
  key?: Buffer,
): Promise<{ url_hint: string; countries: string[] | null; replaced: boolean }> {
  const parsed = affiliateInput.safeParse({ ...raw, active: true, sourceId: null });
  if (!parsed.success)
    throw new AdminError("_form", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  if (!parsed.data.url) throw new AdminError("url", "The affiliate URL is required");
  const [app] = await sql<{ id: string; link_id: string | null }[]>`
    select a.id, l.id as link_id from apps a left join affiliate_links l on l.app_id = a.id and l.active
    where a.slug = ${slug}`;
  if (!app) throw new AdminError("slug", `No app with slug ${slug}`);
  const id = await saveAffiliateLink(sql, actor, app.id, app.link_id, parsed.data, key);
  const [l] = await sql<{ url_hint: string; countries: string[] | null }[]>`
    select url_hint, countries from affiliate_links where id = ${id}`;
  return { url_hint: l!.url_hint, countries: l!.countries, replaced: !!app.link_id };
}
