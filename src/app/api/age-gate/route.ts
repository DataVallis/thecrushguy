import { siteUrl } from "@/lib/env";
import { AGE_COOKIE, AGE_COOKIE_MAX_AGE_S, safeReturnPath } from "@/lib/age-gate/policy";

/**
 * POST /api/age-gate (form: confirm=yes, next=/local/path) → sets the self-declaration cookie and goes back.
 * Without confirm=yes nothing is set. Cross-site posts are refused (Origin must be our site).
 */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const site = new URL(siteUrl());
  if (origin && origin !== site.origin) return new Response("Forbidden", { status: 403 });
  const form = await request.formData().catch(() => null);
  const next = safeReturnPath(form?.get("next"));
  const headers = new Headers({ Location: new URL(next, site).toString(), "Cache-Control": "no-store" });
  if (form?.get("confirm") === "yes") {
    const secure = site.protocol === "https:" ? "; Secure" : "";
    headers.append(
      "Set-Cookie",
      `${AGE_COOKIE}=1; Path=/; Max-Age=${AGE_COOKIE_MAX_AGE_S}; HttpOnly; SameSite=Lax${secure}`,
    );
  }
  return new Response(null, { status: 303, headers });
}
