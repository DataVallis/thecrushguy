import { pingDb } from "@/lib/db/client";
import { appEnv } from "@/lib/env";

export async function GET(): Promise<Response> {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  const base = { env: appEnv(), version: process.env.GIT_SHA ?? "unknown" };
  try {
    await pingDb();
    return Response.json({ status: "ok", db: "ok", ...base }, { status: 200, headers });
  } catch {
    // Never leak connection details or error messages.
    return Response.json({ status: "error", db: "down", ...base }, { status: 503, headers });
  }
}
