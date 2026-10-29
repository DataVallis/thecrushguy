import { connection } from "next/server";
import { isIndexable, siteUrl } from "@/lib/env";

// Read env at request time so one image serves dev and prod correctly.
export async function GET(): Promise<Response> {
  await connection();
  const body = isIndexable()
    ? `User-agent: *\nAllow: /\nDisallow: /go/\nDisallow: /api/\nDisallow: /admin\n\nSitemap: ${siteUrl()}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
