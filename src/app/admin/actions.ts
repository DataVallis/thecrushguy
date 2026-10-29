"use server";

import { redirect } from "next/navigation";
import { loginMailSender } from "@/lib/auth/mail";
import { consumeLoginToken, requestLoginLink } from "@/lib/auth/service";
import { clientIp, endSession, setSessionCookie } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import { siteUrl } from "@/lib/env";

/** Same redirect for every outcome — the page never reveals whether an address is allowed (ADR-017). */
export async function requestLinkAction(formData: FormData): Promise<void> {
  const outcome = await requestLoginLink(sql(), {
    email: formData.get("email"),
    ip: await clientIp(),
    baseUrl: siteUrl(), // never the request Host header (host-header injection)
    send: loginMailSender(),
  });
  if (outcome === "limited") console.warn("[auth] login link request rate-limited");
  redirect("/admin/login?sent=1");
}

/** POST from the verify page: link scanners that only GET the URL can't burn the single-use token. */
export async function verifyLinkAction(formData: FormData): Promise<void> {
  const session = await consumeLoginToken(sql(), formData.get("token"));
  if (!session) redirect("/admin/login?error=link");
  await setSessionCookie(session);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}
