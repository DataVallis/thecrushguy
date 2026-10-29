CREATE TABLE "admin_login_tokens" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_login_tokens_hash_hex" CHECK ("admin_login_tokens"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "admin_login_tokens_email_lower" CHECK ("admin_login_tokens"."email" = lower("admin_login_tokens"."email"))
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" char(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_hash_hex" CHECK ("admin_sessions"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "admin_sessions_email_lower" CHECK ("admin_sessions"."email" = lower("admin_sessions"."email"))
);
--> statement-breakpoint
CREATE TABLE "auth_rate_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bucket" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_login_tokens_hash_uq" ON "admin_login_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_login_tokens_email_idx" ON "admin_login_tokens" USING btree ("email","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_hash_uq" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "auth_rate_events_bucket_at_idx" ON "auth_rate_events" USING btree ("bucket","at");