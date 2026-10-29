CREATE TABLE "clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"app_id" uuid NOT NULL,
	"link_id" uuid,
	"placement" text NOT NULL,
	"locale" text,
	"country" char(2),
	"device" text NOT NULL,
	"referrer_path" text,
	"ip_hash" char(64) NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clicks_device" CHECK ("clicks"."device" in ('mobile', 'tablet', 'desktop')),
	CONSTRAINT "clicks_placement_format" CHECK ("clicks"."placement" ~ '^[a-z0-9_-]{1,32}$')
);
--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_link_id_affiliate_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."affiliate_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clicks_app_at_idx" ON "clicks" USING btree ("app_id","at");--> statement-breakpoint
CREATE INDEX "clicks_at_idx" ON "clicks" USING btree ("at");--> statement-breakpoint
CREATE INDEX "clicks_ip_at_idx" ON "clicks" USING btree ("ip_hash","at");