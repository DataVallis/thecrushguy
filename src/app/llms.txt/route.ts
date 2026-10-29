import { connection } from "next/server";
import { defaultLocale } from "@/i18n/config";
import { sql } from "@/lib/db/client";
import { siteUrl } from "@/lib/env";
import { llmsTxt, loadLlmsData } from "@/lib/seo/geo";

/** https://llmstxt.org — a plain-markdown map of the site for AI agents (TASK-017). */
export async function GET(): Promise<Response> {
  await connection();
  const { apps, categories } = await loadLlmsData(sql());
  return new Response(llmsTxt(siteUrl(), defaultLocale, apps, categories), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
