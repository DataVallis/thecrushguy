import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { sql } from "@/lib/db/client";
import { siteUrl } from "@/lib/env";
import { SESSION_COOKIE } from "./config";
import { deleteSession, sessionEmail, type NewSession } from "./service";

/**
 * Data access layer for admin auth. Every /admin page and every admin server action calls `requireAdmin()`
 * on the server; the cookie check in `proxy.ts` is only an early redirect, never the protection itself.
 */
export async function currentAdmin(): Promise<string | null> {
  await connection(); // request-time only: session validity depends on the current time
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return sessionEmail(sql(), token);
}

export async function requireAdmin(): Promise<string> {
  const email = await currentAdmin();
  if (!email) redirect("/admin/login");
  return email;
}

export async function setSessionCookie(session: NewSession): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, session.sessionToken, {
    httpOnly: true,
    secure: siteUrl().startsWith("https://"),
    sameSite: "lax",
    path: "/admin",
    expires: session.expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  await deleteSession(sql(), jar.get(SESSION_COOKIE)?.value);
  jar.delete({ name: SESSION_COOKIE, path: "/admin" });
}

/** Client IP as set by host nginx (`X-Real-IP $remote_addr`, ops/nginx). Only used hashed, for rate limits. */
export async function clientIp(): Promise<string> {
  return (await headers()).get("x-real-ip")?.trim() || "unknown";
}
