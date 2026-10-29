import { connection } from "next/server";
import { isIndexable, siteUrl } from "@/lib/env";
import { indexXml } from "@/lib/seo/sitemap";

// Sitemap index (TASK-014). Non-prod environments return an empty index — they are never indexed.
export async function GET(): Promise<Response> {
  await connection();
  const xml = isIndexable()
    ? indexXml(siteUrl())
    : '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>';
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
