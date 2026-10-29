import { connection } from "next/server";
import { sql } from "@/lib/db/client";
import { siteUrl } from "@/lib/env";
import { parseSitemapName, sitemapEntries, urlsetXml } from "@/lib/seo/sitemap";

// /sitemaps/{locale}-{pages|categories|apps}.xml — published locales only, indexable URLs only (TASK-014).
export async function GET(_req: Request, ctx: RouteContext<"/sitemaps/[name]">): Promise<Response> {
  await connection();
  const parsed = parseSitemapName((await ctx.params).name);
  if (!parsed) return new Response("Not found", { status: 404 });
  const entries = await sitemapEntries(sql(), siteUrl(), parsed.locale, parsed.type);
  return new Response(urlsetXml(entries), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
