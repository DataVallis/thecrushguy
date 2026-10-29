/**
 * Data model — docs/01-PRODUCT-SPEC.md §5, TASK-011a.
 * Rules enforced in the database (not only in the app):
 *  - an app can only be `published` when every compliance checklist item is true and was checked (07-LEGAL §2);
 *  - money is integer minor units, never negative; scores are 0–100; slugs are lowercase-kebab.
 * Affiliate URLs are stored encrypted (src/lib/crypto/link-cipher.ts), never in plain text.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigserial,
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const SLUG_RE = "^[a-z0-9]+(-[a-z0-9]+)*$";
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const appStatus = pgEnum("app_status", ["draft", "published", "paused", "removed"]);
export const pricingPeriod = pgEnum("pricing_period", ["month", "year", "lifetime", "credits"]);
export const affiliateNetwork = pgEnum("affiliate_network", ["direct", "crakrevenue", "other"]);
export const affiliateModel = pgEnum("affiliate_model", ["revshare", "cpa", "pps", "hybrid"]);
export const translationStatus = pgEnum("translation_status", ["machine", "reviewed"]);

export { PLATFORMS } from "./platforms";

const score = (name: string) => smallint(name);

export const apps = pgTable(
  "apps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    descriptionMd: text("description_md"),
    websiteUrl: text("website_url").notNull(),
    logoPath: text("logo_path"),
    platforms: text("platforms")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    hasFreePlan: boolean("has_free_plan"),
    startingPriceCents: integer("starting_price_cents"),
    currency: char("currency", { length: 3 }),

    featVoice: boolean("feat_voice").notNull().default(false),
    featImageGen: boolean("feat_image_gen").notNull().default(false),
    featVideo: boolean("feat_video").notNull().default(false),
    featLongTermMemory: boolean("feat_long_term_memory").notNull().default(false),
    featGroupChat: boolean("feat_group_chat").notNull().default(false),
    featCustomCharacter: boolean("feat_custom_character").notNull().default(false),
    featApi: boolean("feat_api").notNull().default(false),
    nsfwAllowed: boolean("nsfw_allowed").notNull().default(false),
    nsfwRequiresToggle: boolean("nsfw_requires_toggle").notNull().default(false),

    companyName: text("company_name"),
    companyCountry: char("company_country", { length: 2 }),
    privacyPolicyUrl: text("privacy_policy_url"),

    scoreConversation: score("score_conversation"),
    scoreMemory: score("score_memory"),
    scoreCustomization: score("score_customization"),
    scoreMedia: score("score_media"),
    scoreValue: score("score_value"),
    scorePrivacy: score("score_privacy"),
    // Editorial content (TASK-012a, 01-PRODUCT-SPEC §3). One-line justification per sub-score, pros/cons (max 5
    // each), "best for" tags and the verdict. Publishing requires them (quality gate, ADR-026).
    scoreConversationNote: text("score_conversation_note"),
    scoreMemoryNote: text("score_memory_note"),
    scoreCustomizationNote: text("score_customization_note"),
    scoreMediaNote: text("score_media_note"),
    scoreValueNote: text("score_value_note"),
    scorePrivacyNote: text("score_privacy_note"),
    pros: text("pros")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    cons: text("cons")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    bestFor: text("best_for")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    verdictMd: text("verdict_md"),

    // Compliance checklist (07-LEGAL-COMPLIANCE §2) — all must be true to publish.
    chk18PlusTerms: boolean("chk_18plus_terms").notNull().default(false),
    chkNoMinorContent: boolean("chk_no_minor_content").notNull().default(false),
    chkNoDeepfakeFeature: boolean("chk_no_deepfake_feature").notNull().default(false),
    chkPrivacyPolicy: boolean("chk_privacy_policy").notNull().default(false),
    chkOperatorIdentifiable: boolean("chk_operator_identifiable").notNull().default(false),
    checklistCheckedAt: timestamp("checklist_checked_at", { withTimezone: true }),
    checklistNote: text("checklist_note"),

    status: appStatus("status").notNull().default("draft"),
    removalReason: text("removal_reason"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("apps_slug_uq").on(t.slug),
    index("apps_status_idx").on(t.status),
    check("apps_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_RE}'`)}`),
    check("apps_price_nonneg", sql`${t.startingPriceCents} IS NULL OR ${t.startingPriceCents} >= 0`),
    check("apps_currency_format", sql`${t.currency} IS NULL OR ${t.currency} ~ '^[A-Z]{3}$'`),
    check("apps_country_format", sql`${t.companyCountry} IS NULL OR ${t.companyCountry} ~ '^[A-Z]{2}$'`),
    check(
      "apps_scores_range",
      sql`(${t.scoreConversation} IS NULL OR ${t.scoreConversation} BETWEEN 0 AND 100)
      AND (${t.scoreMemory} IS NULL OR ${t.scoreMemory} BETWEEN 0 AND 100)
      AND (${t.scoreCustomization} IS NULL OR ${t.scoreCustomization} BETWEEN 0 AND 100)
      AND (${t.scoreMedia} IS NULL OR ${t.scoreMedia} BETWEEN 0 AND 100)
      AND (${t.scoreValue} IS NULL OR ${t.scoreValue} BETWEEN 0 AND 100)
      AND (${t.scorePrivacy} IS NULL OR ${t.scorePrivacy} BETWEEN 0 AND 100)`,
    ),
    check(
      "apps_publish_requires_checklist",
      sql`${t.status} <> 'published' OR (
        ${t.chk18PlusTerms} AND ${t.chkNoMinorContent} AND ${t.chkNoDeepfakeFeature}
        AND ${t.chkPrivacyPolicy} AND ${t.chkOperatorIdentifiable}
        AND ${t.checklistCheckedAt} IS NOT NULL)`,
    ),
    check("apps_removed_needs_reason", sql`${t.status} <> 'removed' OR ${t.removalReason} IS NOT NULL`),
    check("apps_pros_cons_max5", sql`cardinality(${t.pros}) <= 5 AND cardinality(${t.cons}) <= 5`),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "set null" }),
    sort: integer("sort").notNull().default(0),
    isNsfw: boolean("is_nsfw").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("categories_slug_uq").on(t.slug),
    check("categories_slug_format", sql`${t.slug} ~ ${sql.raw(`'${SLUG_RE}'`)}`),
    check("categories_not_own_parent", sql`${t.parentId} IS NULL OR ${t.parentId} <> ${t.id}`),
  ],
);

export const appCategories = pgTable(
  "app_categories",
  {
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    rankOverride: smallint("rank_override"),
  },
  (t) => [
    primaryKey({ columns: [t.appId, t.categoryId] }),
    check("app_categories_rank_positive", sql`${t.rankOverride} IS NULL OR ${t.rankOverride} >= 1`),
  ],
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    field: text("field").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    archivedUrl: text("archived_url"),
    createdAt: createdAt(),
  },
  (t) => [index("sources_app_idx").on(t.appId), check("sources_url_http", sql`${t.url} ~ '^https?://'`)],
);

export const pricingPlans = pgTable(
  "pricing_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    period: pricingPeriod("period").notNull(),
    notes: text("notes"),
    // A price is a factual claim → it must have a source (CLAUDE.md hard rule).
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("pricing_plans_app_idx").on(t.appId),
    check("pricing_plans_price_nonneg", sql`${t.priceCents} >= 0`),
    check("pricing_plans_currency_format", sql`${t.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const affiliateLinks = pgTable(
  "affiliate_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    network: affiliateNetwork("network").notNull(),
    model: affiliateModel("model").notNull(),
    termsSummary: text("terms_summary"),
    /** AES-256-GCM ciphertext of the full affiliate URL (contains IDs) — never store it in plain text. */
    urlEncrypted: text("url_encrypted").notNull(),
    /** Non-secret hint for the admin UI, e.g. the target host. */
    urlHint: text("url_hint").notNull(),
    active: boolean("active").notNull().default(true),
    sourceId: uuid("source_id").references(() => sources.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("affiliate_links_app_idx").on(t.appId),
    // At most one active link per app (TASK-013 redirects to it).
    uniqueIndex("affiliate_links_one_active_per_app")
      .on(t.appId)
      .where(sql`${t.active}`),
  ],
);

export const translations = pgTable(
  "translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entity: text("entity").notNull(),
    entityId: uuid("entity_id").notNull(),
    field: text("field").notNull(),
    locale: text("locale").notNull(),
    value: text("value").notNull(),
    status: translationStatus("status").notNull().default("machine"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("translations_uq").on(t.entity, t.entityId, t.field, t.locale),
    check("translations_locale_format", sql`${t.locale} ~ '^[a-z]{2}(-[A-Z]{2})?$'`),
  ],
);

/** Append-only log of admin changes (DEVELOPMENT-RULES §10). UPDATE/DELETE/TRUNCATE blocked by trigger (migration 0001). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    diff: jsonb("diff"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_entity_idx").on(t.entity, t.entityId), index("audit_log_at_idx").on(t.at)],
);

/**
 * Admin magic-link login (TASK-011b, ADR-017/022). Only SHA-256 hashes of tokens are stored — a DB leak
 * cannot be replayed as a login link or a session cookie.
 */
export const adminLoginTokens = pgTable(
  "admin_login_tokens",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: text("email").notNull(),
    tokenHash: char("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("admin_login_tokens_hash_uq").on(t.tokenHash),
    index("admin_login_tokens_email_idx").on(t.email, t.createdAt),
    check("admin_login_tokens_hash_hex", sql`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check("admin_login_tokens_email_lower", sql`${t.email} = lower(${t.email})`),
  ],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    tokenHash: char("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("admin_sessions_hash_uq").on(t.tokenHash),
    index("admin_sessions_expires_idx").on(t.expiresAt),
    check("admin_sessions_hash_hex", sql`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check("admin_sessions_email_lower", sql`${t.email} = lower(${t.email})`),
  ],
);

/**
 * Rate-limit events for login-link requests. `bucket` is "email:<sha256>" or "ip:<hmac>" — never a raw
 * email or IP (07-LEGAL privacy, 02-ARCHITECTURE "no raw IP storage"). Rows older than 24 h are pruned.
 */
export const authRateEvents = pgTable(
  "auth_rate_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    bucket: text("bucket").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_rate_events_bucket_at_idx").on(t.bucket, t.at)],
);

/**
 * Outbound clicks on `/go/{slug}` (TASK-013, 02-ARCHITECTURE "Outbound click tracking"). No raw IP: `ip_hash` is an
 * HMAC with a daily salt. `placement` and `locale` come from validated query params; `referrer_path` is a path on
 * our own site only (no query, no foreign hosts).
 */
export const clicks = pgTable(
  "clicks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    linkId: uuid("link_id").references(() => affiliateLinks.id, { onDelete: "set null" }),
    placement: text("placement").notNull(),
    locale: text("locale"),
    country: char("country", { length: 2 }),
    device: text("device").notNull(),
    referrerPath: text("referrer_path"),
    ipHash: char("ip_hash", { length: 64 }).notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("clicks_app_at_idx").on(t.appId, t.at),
    index("clicks_at_idx").on(t.at),
    index("clicks_ip_at_idx").on(t.ipHash, t.at),
    check("clicks_device", sql`${t.device} in ('mobile', 'tablet', 'desktop')`),
    check("clicks_placement_format", sql`${t.placement} ~ '^[a-z0-9_-]{1,32}$'`),
  ],
);
