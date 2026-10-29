import { connection } from "next/server";
import { isIndexable, siteUrl } from "@/lib/env";
import { robotsTxt } from "@/lib/seo/geo";

// Read env at request time so one image serves dev and prod correctly.
export async function GET(): Promise<Response> {
  await connection();
  const body = robotsTxt({
    indexable: isIndexable(),
    site: siteUrl(),
    blockTraining: process.env.AI_TRAINING_BOTS === "block",
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
