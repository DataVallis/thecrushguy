ALTER TABLE "apps" ADD COLUMN "score_conversation_note" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "score_memory_note" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "score_customization_note" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "score_media_note" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "score_value_note" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "score_privacy_note" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "pros" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "cons" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "best_for" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "verdict_md" text;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_pros_cons_max5" CHECK (cardinality("apps"."pros") <= 5 AND cardinality("apps"."cons") <= 5);