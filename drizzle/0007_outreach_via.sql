ALTER TABLE "affiliate_outreach" ADD COLUMN "via" text;--> statement-breakpoint
UPDATE "affiliate_outreach" SET "via" = 'CrakRevenue' WHERE "notes" ILIKE '%via CrakRevenue%';
