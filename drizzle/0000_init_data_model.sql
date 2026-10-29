CREATE TYPE "public"."affiliate_model" AS ENUM('revshare', 'cpa', 'pps', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."affiliate_network" AS ENUM('direct', 'crakrevenue', 'other');--> statement-breakpoint
CREATE TYPE "public"."app_status" AS ENUM('draft', 'published', 'paused', 'removed');--> statement-breakpoint
CREATE TYPE "public"."pricing_period" AS ENUM('month', 'year', 'lifetime', 'credits');--> statement-breakpoint
CREATE TYPE "public"."translation_status" AS ENUM('machine', 'reviewed');--> statement-breakpoint
CREATE TABLE "affiliate_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"network" "affiliate_network" NOT NULL,
	"model" "affiliate_model" NOT NULL,
	"terms_summary" text,
	"url_encrypted" text NOT NULL,
	"url_hint" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_categories" (
	"app_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"rank_override" smallint,
	CONSTRAINT "app_categories_app_id_category_id_pk" PRIMARY KEY("app_id","category_id"),
	CONSTRAINT "app_categories_rank_positive" CHECK ("app_categories"."rank_override" IS NULL OR "app_categories"."rank_override" >= 1)
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"description_md" text,
	"website_url" text NOT NULL,
	"logo_path" text,
	"platforms" text[] DEFAULT '{}'::text[] NOT NULL,
	"has_free_plan" boolean,
	"starting_price_cents" integer,
	"currency" char(3),
	"feat_voice" boolean DEFAULT false NOT NULL,
	"feat_image_gen" boolean DEFAULT false NOT NULL,
	"feat_video" boolean DEFAULT false NOT NULL,
	"feat_long_term_memory" boolean DEFAULT false NOT NULL,
	"feat_group_chat" boolean DEFAULT false NOT NULL,
	"feat_custom_character" boolean DEFAULT false NOT NULL,
	"feat_api" boolean DEFAULT false NOT NULL,
	"nsfw_allowed" boolean DEFAULT false NOT NULL,
	"nsfw_requires_toggle" boolean DEFAULT false NOT NULL,
	"company_name" text,
	"company_country" char(2),
	"privacy_policy_url" text,
	"score_conversation" smallint,
	"score_memory" smallint,
	"score_customization" smallint,
	"score_media" smallint,
	"score_value" smallint,
	"score_privacy" smallint,
	"chk_18plus_terms" boolean DEFAULT false NOT NULL,
	"chk_no_minor_content" boolean DEFAULT false NOT NULL,
	"chk_no_deepfake_feature" boolean DEFAULT false NOT NULL,
	"chk_privacy_policy" boolean DEFAULT false NOT NULL,
	"chk_operator_identifiable" boolean DEFAULT false NOT NULL,
	"checklist_checked_at" timestamp with time zone,
	"checklist_note" text,
	"status" "app_status" DEFAULT 'draft' NOT NULL,
	"removal_reason" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apps_slug_format" CHECK ("apps"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "apps_price_nonneg" CHECK ("apps"."starting_price_cents" IS NULL OR "apps"."starting_price_cents" >= 0),
	CONSTRAINT "apps_currency_format" CHECK ("apps"."currency" IS NULL OR "apps"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "apps_country_format" CHECK ("apps"."company_country" IS NULL OR "apps"."company_country" ~ '^[A-Z]{2}$'),
	CONSTRAINT "apps_scores_range" CHECK (("apps"."score_conversation" IS NULL OR "apps"."score_conversation" BETWEEN 0 AND 100)
      AND ("apps"."score_memory" IS NULL OR "apps"."score_memory" BETWEEN 0 AND 100)
      AND ("apps"."score_customization" IS NULL OR "apps"."score_customization" BETWEEN 0 AND 100)
      AND ("apps"."score_media" IS NULL OR "apps"."score_media" BETWEEN 0 AND 100)
      AND ("apps"."score_value" IS NULL OR "apps"."score_value" BETWEEN 0 AND 100)
      AND ("apps"."score_privacy" IS NULL OR "apps"."score_privacy" BETWEEN 0 AND 100)),
	CONSTRAINT "apps_publish_requires_checklist" CHECK ("apps"."status" <> 'published' OR (
        "apps"."chk_18plus_terms" AND "apps"."chk_no_minor_content" AND "apps"."chk_no_deepfake_feature"
        AND "apps"."chk_privacy_policy" AND "apps"."chk_operator_identifiable"
        AND "apps"."checklist_checked_at" IS NOT NULL)),
	CONSTRAINT "apps_removed_needs_reason" CHECK ("apps"."status" <> 'removed' OR "apps"."removal_reason" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_email" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"diff" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_id" uuid,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_nsfw" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_format" CHECK ("categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "categories_not_own_parent" CHECK ("categories"."parent_id" IS NULL OR "categories"."parent_id" <> "categories"."id")
);
--> statement-breakpoint
CREATE TABLE "pricing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" char(3) NOT NULL,
	"period" "pricing_period" NOT NULL,
	"notes" text,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_plans_price_nonneg" CHECK ("pricing_plans"."price_cents" >= 0),
	CONSTRAINT "pricing_plans_currency_format" CHECK ("pricing_plans"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"url" text NOT NULL,
	"field" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"archived_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_url_http" CHECK ("sources"."url" ~ '^https?://')
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"field" text NOT NULL,
	"locale" text NOT NULL,
	"value" text NOT NULL,
	"status" "translation_status" DEFAULT 'machine' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translations_locale_format" CHECK ("translations"."locale" ~ '^[a-z]{2}(-[A-Z]{2})?$')
);
--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_categories" ADD CONSTRAINT "app_categories_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_categories" ADD CONSTRAINT "app_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affiliate_links_app_idx" ON "affiliate_links" USING btree ("app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_links_one_active_per_app" ON "affiliate_links" USING btree ("app_id") WHERE "affiliate_links"."active";--> statement-breakpoint
CREATE UNIQUE INDEX "apps_slug_uq" ON "apps" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "apps_status_idx" ON "apps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_uq" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "pricing_plans_app_idx" ON "pricing_plans" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "sources_app_idx" ON "sources" USING btree ("app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "translations_uq" ON "translations" USING btree ("entity","entity_id","field","locale");