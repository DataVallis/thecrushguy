/**
 * MCP tools for the research agent (TASK-021, ADR-033): read the catalogue and add sourced facts, prices and
 * checklist items — the same writes the owner does in /admin, each in a transaction with an audit row.
 *
 * Deliberately NOT available here (07-LEGAL §2, ADR-030): publishing, the gallery check (`chk_no_minor_content`)
 * and affiliate links. Those stay human, in /admin.
 */
import type postgres from "postgres";
import { z } from "zod";
import bundle from "@/data/research-bundle.json";
import { bundleSchema, importFacts, importResearchBundle, recomputeApp } from "@/lib/admin/facts-import";
import { AdminError, audit, changes, qualityGaps, reviewQueue, setAppStatus } from "@/lib/admin/repo";
import {
  OUTREACH_STATUSES,
  deleteOutreach,
  forgottenApps,
  listOutreach,
  seedOutreach,
  upsertOutreach,
} from "@/lib/admin/outreach";
import { syncAutoCategories } from "@/lib/catalog/auto-categories";
import { forgetKnownSlugs } from "@/lib/seo/known-slugs";
import { factsSchema } from "@/lib/review/data-review";

export const MCP_ACTOR = "mcp-agent@thecrushguy.com";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase-kebab slug");
const url = z.string().refine((v) => /^https?:\/\/\S+$/.test(v) && URL.canParse(v), "http(s) URL");
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

type Tool = {
  name: string;
  description: string;
  input: z.ZodObject;
  run: (sql: postgres.Sql, args: never) => Promise<unknown>;
};

async function appBySlug(sql: postgres.Sql, s: string) {
  const [a] = await sql<Record<string, unknown>[]>`select * from apps where slug = ${s}`;
  if (!a) throw new AdminError("slug", `No app with slug ${s}`);
  return a;
}

async function ensureSource(
  tx: postgres.TransactionSql | postgres.Sql,
  appId: string,
  u: string,
  field: string,
  checked?: string,
) {
  const [hit] = await tx<
    { id: string }[]
  >`select id from sources where app_id = ${appId} and url = ${u} and field = ${field}`;
  if (hit) return hit.id;
  const row = { app_id: appId, url: u, field, checked_at: checked ? new Date(`${checked}T00:00:00Z`) : new Date() };
  const [r] = await tx<{ id: string }[]>`insert into sources ${tx(row)} returning id`;
  await audit(tx, MCP_ACTOR, "create", "source", r!.id, row);
  return r!.id;
}

/** Fact paths an agent may set (FACTS-BRIEF format). */
const FACT_PATHS = [
  "pricing.has_free_plan",
  "pricing.free_plan_limits",
  "pricing.uses_tokens_or_credits",
  "features.long_term_memory",
  "features.voice_messages",
  "features.voice_calls",
  "features.image_generation",
  "features.custom_character_creation",
  "features.group_chat",
  "features.nsfw_allowed",
  "privacy.account_data_deletion",
  "privacy.sells_or_shares_for_ads",
  "privacy.chats_used_for_training",
  "privacy.retention_period_stated",
  "terms.min_age_18",
  "terms.bans_minor_content",
  "terms.refund_policy_stated",
  "terms.age_verification",
  "operator.name",
  "operator.country",
  "operator.address_stated",
  "no_deepfake_feature",
  "audience",
] as const;

const CHECK_ITEMS = [
  "chk_18plus_terms",
  "chk_no_deepfake_feature",
  "chk_privacy_policy",
  "chk_operator_identifiable",
] as const;

export const TOOLS: Tool[] = [
  {
    name: "review_queue",
    description:
      "Draft data-based reviews with what still blocks each one. 'ready' means only the owner's gallery check is missing.",
    input: z.object({}),
    run: async (sql) => {
      const q = await reviewQueue(sql);
      return q.map((x) => ({ slug: x.slug, name: x.name, ready: x.blockers.length === 0, blockers: x.blockers }));
    },
  },
  {
    name: "list_apps",
    description: "All apps with status, review method and starting price.",
    input: z.object({ status: z.enum(["draft", "published", "paused", "removed"]).optional() }),
    run: async (sql, a: { status?: string }) =>
      sql`select slug, name, status, review_method, starting_price_cents, currency, has_free_plan from apps
        where (${a.status ?? null}::text is null or status::text = ${a.status ?? null}) order by name`,
  },
  {
    name: "get_app",
    description: "One app: core fields, stored facts, sources, price plans, checklist and quality gaps.",
    input: z.object({ slug }),
    run: async (sql, a: { slug: string }) => {
      const app = await appBySlug(sql, a.slug);
      const [sources, plans, gaps] = await Promise.all([
        sql`select url, field, checked_at from sources where app_id = ${app.id as string} order by field`,
        sql`select p.name, p.price_cents, p.currency, p.period, p.notes, s.url as source_url from pricing_plans p
          join sources s on s.id = p.source_id where p.app_id = ${app.id as string}`,
        qualityGaps(sql, app.id as string),
      ]);
      const pick = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, app[k]]));
      return {
        ...pick([
          "slug",
          "name",
          "status",
          "website_url",
          "tagline",
          "review_method",
          "company_name",
          "company_country",
        ]),
        checklist: pick([
          "chk_18plus_terms",
          "chk_no_minor_content",
          "chk_no_deepfake_feature",
          "chk_privacy_policy",
          "chk_operator_identifiable",
        ]),
        scores: pick(["score_memory", "score_customization", "score_media", "score_value", "score_privacy"]),
        pros: app.pros,
        cons: app.cons,
        facts: app.facts,
        sources,
        plans,
        quality_gaps: gaps,
      };
    },
  },
  {
    name: "add_app",
    description: "Create a new app as a draft (never published). Add facts with set_facts afterwards.",
    input: z.object({
      slug,
      name: z.string().min(1).max(120),
      website_url: url,
      tagline: z.string().max(200).optional(),
    }),
    run: async (sql, a: { slug: string; name: string; website_url: string; tagline?: string }) =>
      sql.begin(async (tx) => {
        const row = { slug: a.slug, name: a.name, website_url: a.website_url, tagline: a.tagline ?? null };
        const [r] = await tx<{ id: string }[]>`insert into apps ${tx(row)} on conflict (slug) do nothing returning id`;
        if (!r) throw new AdminError("slug", "An app with this slug already exists");
        await audit(tx, MCP_ACTOR, "create", "app", r.id, row);
        return { created: a.slug, status: "draft" };
      }),
  },
  {
    name: "add_source",
    description: "Attach a source URL to an app (what it supports, e.g. 'pricing', '18+ requirement').",
    input: z.object({ slug, url, field: z.string().min(1).max(200), checked_at: day }),
    run: async (sql, a: { slug: string; url: string; field: string; checked_at?: string }) => {
      const app = await appBySlug(sql, a.slug);
      await sql.begin((tx) => ensureSource(tx, app.id as string, a.url, a.field, a.checked_at));
      return { ok: true };
    },
  },
  {
    name: "set_price",
    description:
      "Add or replace a price plan with its source. Use the REGULAR monthly price (not a first-month promo); a yearly plan only if there is no monthly one. Recomputes the data review.",
    input: z.object({
      slug,
      plan_name: z.string().min(1).max(120),
      price: z.number().nonnegative(),
      currency: z.string().regex(/^[A-Z]{3}$/),
      period: z.enum(["month", "year"]),
      source_url: url,
      checked_at: day,
    }),
    run: async (
      sql,
      a: {
        slug: string;
        plan_name: string;
        price: number;
        currency: string;
        period: string;
        source_url: string;
        checked_at?: string;
      },
    ) => {
      const app = await appBySlug(sql, a.slug);
      const id = app.id as string;
      await sql.begin(async (tx) => {
        const sourceId = await ensureSource(tx, id, a.source_url, "pricing", a.checked_at);
        const row = {
          name: a.plan_name,
          price_cents: Math.round(a.price * 100),
          currency: a.currency,
          period: a.period,
          source_id: sourceId,
        };
        const [old] = await tx<Record<string, unknown>[]>`
          select * from pricing_plans where app_id = ${id} and name = ${a.plan_name} for update`;
        if (old) {
          await tx`update pricing_plans set ${tx(row)} where id = ${old.id as string}`;
          await audit(tx, MCP_ACTOR, "update", "pricing_plan", old.id as string, changes(old, row));
        } else {
          const [r] = await tx<{ id: string }[]>`insert into pricing_plans ${tx({ ...row, app_id: id })} returning id`;
          await audit(tx, MCP_ACTOR, "create", "pricing_plan", r!.id, row);
        }
      });
      await recomputeApp(sql, MCP_ACTOR, id);
      return { ok: true, quality_gaps: await qualityGaps(sql, id) };
    },
  },
  {
    name: "set_fact",
    description: `Set one sourced fact and recompute the data review. path: ${FACT_PATHS.join(", ")}. value: yes/no/unknown (training also opt-out; audience: girlfriend/boyfriend/both/friend — who the companions are as the app presents them; operator.name/country/free_plan_limits/age_verification are text). A quote (≤25 words) is required for privacy.* and terms.*.`,
    input: z.object({
      slug,
      path: z.enum(FACT_PATHS),
      value: z.string().min(1).max(300),
      source_url: url,
      quote: z.string().max(300).optional(),
    }),
    run: async (sql, a: { slug: string; path: string; value: string; source_url: string; quote?: string }) => {
      if (/^(privacy|terms)\./.test(a.path) && !a.quote)
        throw new AdminError("quote", "Privacy/terms facts need a quote");
      const app = await appBySlug(sql, a.slug);
      if (!app.facts) throw new AdminError("slug", "This app has no facts yet — use set_facts first");
      const facts = structuredClone(app.facts) as Record<string, Record<string, unknown>>;
      const [group, key] = a.path.includes(".") ? a.path.split(".") : [a.path, null];
      const val = { v: a.value, src: a.source_url, ...(a.quote ? { q: a.quote } : {}) };
      if (key) facts[group!] = { ...(facts[group!] ?? {}), [key]: val };
      else (facts as Record<string, unknown>)[group!] = val;
      const r = await importFacts(sql, MCP_ACTOR, [facts]);
      if (r.errors.length) throw new AdminError("facts", r.errors.join("; "));
      return { ok: true, quality_gaps: await qualityGaps(sql, app.id as string) };
    },
  },
  {
    name: "set_facts",
    description:
      "Replace an app's whole facts object (docs/research/FACTS-BRIEF.md format, plus optional no_deepfake_feature {v,src}) and recompute. The app must exist (add_app).",
    input: z.object({ facts: z.record(z.string(), z.unknown()) }),
    run: async (sql, a: { facts: Record<string, unknown> }) => {
      const parsed = factsSchema.safeParse(a.facts);
      if (!parsed.success) throw new AdminError("facts", parsed.error.issues[0]?.message ?? "invalid facts");
      const r = await importFacts(sql, MCP_ACTOR, [a.facts]);
      if (r.errors.length || r.notFound.length) throw new AdminError("facts", [...r.errors, ...r.notFound].join("; "));
      const app = await appBySlug(sql, parsed.data.slug);
      return { ok: true, updated: r.updated, quality_gaps: await qualityGaps(sql, app.id as string) };
    },
  },
  {
    name: "set_checklist",
    description:
      "Tick or untick a compliance item with its source. Allowed: chk_18plus_terms, chk_no_deepfake_feature, chk_privacy_policy, chk_operator_identifiable. The gallery check (no minor-coded content) is the owner's and can't be set here.",
    input: z.object({
      slug,
      item: z.enum(CHECK_ITEMS),
      value: z.boolean(),
      source_url: url,
      note: z.string().max(300),
    }),
    run: async (sql, a: { slug: string; item: string; value: boolean; source_url: string; note: string }) => {
      const app = await appBySlug(sql, a.slug);
      if (!a.value && app.status === "published")
        throw new AdminError("item", "Unpublish first (set_status paused) before removing a checklist item");
      await sql.begin(async (tx) => {
        await ensureSource(tx, app.id as string, a.source_url, a.item.replace(/^chk_/, "checklist: "));
        const next = { [a.item]: a.value };
        await tx`update apps set ${tx(next)} where id = ${app.id as string}`;
        await audit(tx, MCP_ACTOR, "checklist", "app", app.id as string, { ...changes(app, next), note: a.note });
      });
      return { ok: true };
    },
  },
  {
    name: "set_status",
    description: "Move an app to draft, paused or removed (reason required for removed). Publishing is owner-only.",
    input: z.object({ slug, status: z.enum(["draft", "paused", "removed"]), reason: z.string().max(500).optional() }),
    run: async (sql, a: { slug: string; status: "draft" | "paused" | "removed"; reason?: string }) => {
      const app = await appBySlug(sql, a.slug);
      await setAppStatus(sql, MCP_ACTOR, app.id as string, a.status, a.reason ?? null);
      forgetKnownSlugs();
      return { ok: true };
    },
  },
  {
    name: "list_outreach",
    description:
      "Affiliate outreach tracker: every program/app with status (to_apply, to_contact, applied, approved, rejected, no_program), dates, notes, and whether an active affiliate link exists. Also lists published apps with nothing in progress.",
    input: z.object({}),
    run: async (sql) => ({ outreach: await listOutreach(sql), forgotten_apps: await forgottenApps(sql) }),
  },
  {
    name: "update_outreach",
    description:
      'Create or update an outreach row by program name (e.g. the owner says he applied to Candy AI). status=applied sets applied date (today) and a follow-up in 7 days if missing. via = affiliate network name (e.g. "CrakRevenue"), empty string = direct. Dates as YYYY-MM-DD. Never put affiliate URLs or IDs here.',
    input: z.object({
      program: z.string().min(1).max(120),
      app_slug: z.string().optional(),
      via: z.string().max(60).optional(),
      status: z.enum(OUTREACH_STATUSES).optional(),
      signup_url: z.string().optional(),
      contact: z.string().max(200).optional(),
      applied_at: z.string().optional(),
      follow_up_at: z.string().optional(),
      notes: z.string().max(1000).optional(),
    }),
    run: async (
      sql,
      a: {
        program: string;
        app_slug?: string;
        via?: string;
        status?: (typeof OUTREACH_STATUSES)[number];
        signup_url?: string;
        contact?: string;
        applied_at?: string;
        follow_up_at?: string;
        notes?: string;
      },
    ) =>
      upsertOutreach(sql, MCP_ACTOR, {
        program: a.program,
        appSlug: a.app_slug,
        via: a.via,
        status: a.status,
        signupUrl: a.signup_url,
        contact: a.contact,
        appliedAt: a.applied_at,
        followUpAt: a.follow_up_at,
        notes: a.notes,
      }),
  },
  {
    name: "delete_outreach",
    description:
      "Delete one outreach row by its exact program name — only for duplicates or rows the owner asked to remove. Audited.",
    input: z.object({ program: z.string().min(1).max(120) }),
    run: async (sql, a: { program: string }) => ({ deleted: await deleteOutreach(sql, MCP_ACTOR, a.program) }),
  },
  {
    name: "seed_outreach",
    description: "Load the researched affiliate programs and apps-to-contact into the tracker (never overwrites).",
    input: z.object({}),
    run: async (sql) => ({ added: await seedOutreach(sql, MCP_ACTOR) }),
  },
  {
    name: "sync_categories",
    description:
      "Create/refresh the fact-driven category lists (free, cheap, voice, pictures, memory, iPhone, Android, adults-only) and recompute which apps belong to each.",
    input: z.object({}),
    run: async (sql) => ({ changes: await syncAutoCategories(sql, MCP_ACTOR) }),
  },
  {
    name: "import_research_bundle",
    description: "Import the research bundle shipped with this release (creates drafts, recomputes data reviews).",
    input: z.object({}),
    run: async (sql) => {
      const r = await importResearchBundle(sql, MCP_ACTOR, bundleSchema.parse(bundle));
      return { seed: r.seed, facts: r.facts };
    },
  },
];
