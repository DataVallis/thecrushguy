ALTER TABLE "apps" ADD COLUMN "review_method" text DEFAULT 'hands_on' NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "facts" jsonb;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "facts_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_review_method" CHECK ("apps"."review_method" IN ('data', 'hands_on'));