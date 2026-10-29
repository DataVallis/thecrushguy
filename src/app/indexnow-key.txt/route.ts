import { connection } from "next/server";
import { indexNowKey } from "@/lib/seo/indexnow";

/** IndexNow key file (keyLocation). The key is a public verification token, not a secret. */
export async function GET(): Promise<Response> {
  await connection();
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
