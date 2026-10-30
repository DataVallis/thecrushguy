/**
 * Affiliate outreach tracker (TASK-025): what to apply for, what is waiting for an answer, what is done.
 * Every write is audited. No affiliate URLs or IDs here — those go encrypted into affiliate_links.
 */
import type postgres from "postgres";
import { z } from "zod";
import seed from "@/data/affiliate-programs.json";
import { AdminError, audit, changes } from "./repo";

export const OUTREACH_STATUSES = ["to_apply", "to_contact", "applied", "approved", "rejected", "no_program"] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];

export const STATUS_LABEL: Record<OutreachStatus, string> = {
  to_apply: "To apply",
  to_contact: "To contact (no public program)",
  applied: "Applied — waiting",
  approved: "Approved",
  rejected: "Rejected",
  no_program: "No program",
};

/** Days after applying before we nudge them. */
export const FOLLOW_UP_DAYS = 7;

const day = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date like 2026-10-30")
  .transform((v) => new Date(`${v}T00:00:00Z`));
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v ? v : null))
    .nullish();

export const outreachInput = z.object({
  program: z.string().trim().min(1).max(120),
  appSlug: z
    .string()
    .trim()
    .transform((v) => (v ? v : null))
    .nullish(),
  signupUrl: z
    .string()
    .trim()
    .transform((v) => (v ? v : null))
    .pipe(
      z
        .string()
        .refine((v) => /^https?:\/\/\S+$/.test(v) && URL.canParse(v), "http(s) URL")
        .nullable(),
    )
    .nullish(),
  contact: optText(200),
  status: z.enum(OUTREACH_STATUSES).optional(),
  appliedAt: day.nullish().or(z.literal("").transform(() => undefined)),
  followUpAt: day.nullish().or(z.literal("").transform(() => undefined)),
  terms: optText(300),
  notes: optText(1000),
});
export type OutreachInput = z.input<typeof outreachInput>;

export type OutreachRow = {
  id: string;
  program: string;
  status: OutreachStatus;
  signup_url: string | null;
  contact: string | null;
  applied_at: Date | null;
  follow_up_at: Date | null;
  terms: string | null;
  notes: string | null;
  updated_at: Date;
  app_slug: string | null;
  app_name: string | null;
  app_status: string | null;
  app_id: string | null;
  has_active_link: boolean;
};

export async function listOutreach(sql: postgres.Sql): Promise<OutreachRow[]> {
  return sql<OutreachRow[]>`
    select o.id, o.program, o.status, o.signup_url, o.contact, o.applied_at, o.follow_up_at, o.terms, o.notes,
      o.updated_at, a.id as app_id, a.slug as app_slug, a.name as app_name, a.status::text as app_status,
      exists(select 1 from affiliate_links l where l.app_id = o.app_id and l.active) as has_active_link
    from affiliate_outreach o left join apps a on a.id = o.app_id
    order by o.follow_up_at nulls last, o.program`;
}

/** Published apps that have neither an active affiliate link nor any outreach row — nothing is happening there. */
export async function forgottenApps(sql: postgres.Sql): Promise<{ id: string; slug: string; name: string }[]> {
  return sql<{ id: string; slug: string; name: string }[]>`
    select a.id, a.slug, a.name from apps a
    where a.status = 'published'
      and not exists(select 1 from affiliate_links l where l.app_id = a.id and l.active)
      and not exists(select 1 from affiliate_outreach o where o.app_id = a.id)
    order by a.name`;
}

/** Create or update by program name. Applying sets applied_at (today) and a follow-up date if missing. */
export async function upsertOutreach(
  sql: postgres.Sql,
  actor: string,
  raw: OutreachInput,
  now = new Date(),
): Promise<{ id: string; created: boolean }> {
  const p = outreachInput.safeParse(raw);
  if (!p.success)
    throw new AdminError("_form", p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  const v = p.data;
  return sql.begin(async (tx) => {
    let appId: string | null | undefined;
    if (v.appSlug !== undefined) {
      if (v.appSlug === null) appId = null;
      else {
        const [a] = await tx<{ id: string }[]>`select id from apps where slug = ${v.appSlug}`;
        if (!a) throw new AdminError("appSlug", `No app with slug ${v.appSlug}`);
        appId = a.id;
      }
    }
    const [before] = await tx<Record<string, unknown>[]>`
      select * from affiliate_outreach where lower(program) = lower(${v.program}) for update`;
    const next: Record<string, unknown> = {};
    if (appId !== undefined) next.app_id = appId;
    for (const [k, col] of [
      ["signupUrl", "signup_url"],
      ["contact", "contact"],
      ["status", "status"],
      ["appliedAt", "applied_at"],
      ["followUpAt", "follow_up_at"],
      ["terms", "terms"],
      ["notes", "notes"],
    ] as const)
      if (v[k] !== undefined) next[col] = v[k];
    const status = (next.status ?? before?.status) as OutreachStatus | undefined;
    if (status === "applied") {
      const applied = (next.applied_at ?? before?.applied_at ?? now) as Date;
      if (!before?.applied_at && next.applied_at === undefined) next.applied_at = applied;
      if (!before?.follow_up_at && next.follow_up_at === undefined)
        next.follow_up_at = new Date(applied.getTime() + FOLLOW_UP_DAYS * 86_400_000);
    }
    if (status === "approved" || status === "rejected" || status === "no_program") {
      if (next.follow_up_at === undefined && before?.follow_up_at) next.follow_up_at = null;
    }
    if (!before) {
      const [r] = await tx<{ id: string }[]>`
        insert into affiliate_outreach ${tx({ program: v.program, ...next })} returning id`;
      await audit(tx, actor, "create", "affiliate_outreach", r!.id, { program: v.program, ...next });
      return { id: r!.id, created: true };
    }
    const diff = changes(before, next);
    if (Object.keys(diff).length) {
      await tx`update affiliate_outreach set ${tx(next)} where id = ${before.id as string}`;
      await audit(tx, actor, "update", "affiliate_outreach", before.id as string, diff);
    }
    return { id: before.id as string, created: false };
  });
}

/** Adds the researched programs (src/data/affiliate-programs.json) that aren't tracked yet. Never overwrites. */
export async function seedOutreach(sql: postgres.Sql, actor: string): Promise<number> {
  let added = 0;
  const existing = new Set(
    (await sql<{ program: string }[]>`select lower(program) as program from affiliate_outreach`).map((r) => r.program),
  );
  for (const s of seed as {
    program: string;
    app: string | null;
    signup_url: string | null;
    terms: string | null;
    notes: string | null;
    status?: OutreachStatus;
  }[]) {
    if (existing.has(s.program.toLowerCase())) continue;
    const [app] = s.app ? await sql`select 1 from apps where slug = ${s.app}` : [true];
    await upsertOutreach(sql, actor, {
      program: s.program,
      appSlug: app && s.app ? s.app : null,
      signupUrl: s.signup_url,
      status: s.status ?? "to_apply",
      terms: s.terms,
      notes: s.notes,
    });
    added++;
  }
  return added;
}

export function isDue(r: Pick<OutreachRow, "follow_up_at" | "status">, now = new Date()): boolean {
  return r.status === "applied" && !!r.follow_up_at && new Date(r.follow_up_at).getTime() <= now.getTime();
}
