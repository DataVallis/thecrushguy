import { NextResponse, type NextRequest } from "next/server";
import { isIndexable } from "@/lib/env";
import { localeRedirect } from "@/lib/routing";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = localeRedirect(pathname, request.headers.get("accept-language"));

  const response = target
    ? NextResponse.redirect(new URL(`${target}${search}`, request.url), 307)
    : NextResponse.next();

  // Runtime guard: only prod may be indexed (same image runs in dev and prod).
  if (!isIndexable()) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
