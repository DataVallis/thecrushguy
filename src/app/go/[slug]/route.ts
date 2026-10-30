import { after, type NextRequest } from "next/server";
import { sql } from "@/lib/db/client";
import { siteUrl } from "@/lib/env";
import {
  cleanLocale,
  cleanPlacement,
  countryOf,
  deviceOf,
  hashIp,
  isBot,
  logClick,
  referrerPath,
  resolveTarget,
} from "@/lib/go/redirect";

// Referrer-Policy comes from next.config (strict-origin-when-cross-origin): partners see our origin, never the path.
const HEADERS = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };

/**
 * GET /go/{slug}?p={placement}&l={locale} → 302 to the app's active affiliate link (TASK-013).
 * The click is written after the response is sent (`after`), so logging never delays the redirect.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/go/[slug]">): Promise<Response> {
  const { slug } = await ctx.params;
  const q = request.nextUrl.searchParams;
  const placement = cleanPlacement(q.get("p"));
  const locale = cleanLocale(q.get("l"));
  const country = countryOf(request.headers.get("cf-ipcountry"));
  const target = await resolveTarget(sql(), slug, { placement, locale, country });

  if (target.kind === "not-found") return new Response("Not found", { status: 404, headers: HEADERS });

  const location = target.kind === "app-page" ? new URL(target.url, siteUrl()).toString() : target.url;
  const ua = request.headers.get("user-agent");
  // Website clicks are logged too (link_id null): shows which apps are worth an affiliate deal.
  if (target.kind !== "app-page" && !isBot(ua)) {
    const ip = request.headers.get("x-real-ip")?.trim() || "unknown";
    const now = new Date();
    const click = {
      appId: target.appId,
      linkId: target.kind === "affiliate" ? target.linkId : null,
      placement,
      locale,
      country,
      device: deviceOf(ua),
      referrerPath: referrerPath(request.headers.get("referer"), siteUrl()),
      ipHash: hashIp(ip, now),
      at: now,
    };
    after(async () => {
      try {
        await logClick(sql(), click);
      } catch (err) {
        console.error("[go] click log failed:", err instanceof Error ? err.message : "unknown error");
      }
    });
  }
  return new Response(null, { status: 302, headers: { ...HEADERS, Location: location } });
}
