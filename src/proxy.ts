import { NextResponse, type NextRequest } from "next/server";
import { adminGateRedirect, isAdminPath } from "@/lib/auth/gate";
import { isIndexable } from "@/lib/env";
import { localeRedirect } from "@/lib/routing";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const admin = isAdminPath(pathname);
  const target = admin
    ? adminGateRedirect(
        pathname,
        request.cookies.getAll().map((c) => c.name),
      )
    : localeRedirect(pathname, request.headers.get("accept-language"));

  const response = target
    ? NextResponse.redirect(new URL(admin ? target : `${target}${search}`, request.url), 307)
    : NextResponse.next();

  // Runtime guard: only prod may be indexed (same image runs in dev and prod).
  if (!isIndexable()) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (admin) {
    // Admin is never indexed or cached, and the verify URL carries a token: never leak it as a referrer.
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
