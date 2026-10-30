CREATE TYPE "public"."outreach_status" AS ENUM('to_apply', 'to_contact', 'applied', 'approved', 'rejected', 'no_program');--> statement-breakpoint
CREATE TABLE "affiliate_outreach" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid,
	"program" text NOT NULL,
	"signup_url" text,
	"contact" text,
	"status" "outreach_status" DEFAULT 'to_apply' NOT NULL,
	"applied_at" timestamp with time zone,
	"follow_up_at" timestamp with time zone,
	"terms" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_outreach_signup_http" CHECK ("affiliate_outreach"."signup_url" IS NULL OR "affiliate_outreach"."signup_url" ~ '^https?://')
);
--> statement-breakpoint
ALTER TABLE "affiliate_outreach" ADD CONSTRAINT "affiliate_outreach_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_outreach_program_uq" ON "affiliate_outreach" USING btree ("program");