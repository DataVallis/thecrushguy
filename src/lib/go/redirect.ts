/**
 * `/go/{slug}` outbound redirect + click tracking (TASK-013, 02-ARCHITECTURE "Outbound click tracking").
 * Pure helpers + DB functions, no Next.js imports, so everything is tested directly.
 */
import { createHmac, randomBytes } from "node:crypto";
import type postgres from "postgres";
import { defaultLocale, isLocale, publishedLocales, type Locale } from "@/i18n/config";
import { decryptLink } from "@/lib/crypto/link-cipher";

export const CLICK_RATE_LIMIT = { max: 30, windowMs: 60 * 60 * 1000 }; // logged clicks per IP hash per hour
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PLACEMENT_RE = /^[a-z0-9_-]{1,32}$/;

/** Known crawlers, link previewers, monitors and HTTP libraries. Bots are redirected but never logged. */
const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegrambot|discordbot|slackbot|skypeuripreview|vkshare|pinterest|outbrain|headless|lighthouse|pagespeed|gtmetrix|uptime|monitor|curl\/|wget\/|python-requests|python-urllib|go-http-client|okhttp|axios\/|node-fetch|undici|java\/|libwww|httpclient|scrapy|phantomjs|selenium|puppeteer|playwright/i;

export function isBot(ua: string | null): boolean {
  return !ua || ua.length < 10 || BOT_RE.test(ua);
}

export function deviceOf(ua: string | null): "mobile" | "tablet" | "desktop" {
  if (!ua) return "desktop";
  if (/ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|windows phone|blackberry|opera mini/i.test(ua)) return "mobile";
  return "desktop";
}

export function cleanSlug(raw: string): string | null {
  return raw.length <= 80 && SLUG_RE.test(raw) ? raw : null;
}

export function cleanPlacement(raw: string | null): string {
  const v = (raw ?? "").toLowerCase();
  return PLACEMENT_RE.test(v) ? v : "unknown";
}

export function cleanLocale(raw: string | null): Locale | null {
  return raw && isLocale(raw) ? raw : null;
}

/** Only the path of a same-site referrer (no query, no fragment, no foreign hosts). */
export function referrerPath(referer: string | null, siteUrl: string): string | null {
  if (!referer) return null;
  try {
    const r = new URL(referer);
    if (r.host !== new URL(siteUrl).host) return null;
    return r.pathname.slice(0, 300);
  } catch {
    return null;
  }
}

export function countryOf(header: string | null): string | null {
  const v = (header ?? "").toUpperCase();
  return /^[A-Z]{2}$/.test(v) && v !== "XX" && v !== "T1" ? v : null;
}

/**
 * Daily IP salt. With LINK_ENCRYPTION_KEY set it is HMAC(key, date) — stable across restarts within a day, so
 * rate limits survive deploys, and useless without the server key. Without the key: random per process + day.
 */
const fallbackSalts = new Map<string, Buffer>();
export function dailySalt(now: Date, key = process.env.LINK_ENCRYPTION_KEY): Buffer {
  const day = now.toISOString().slice(0, 10);
  if (key) return createHmac("sha256", Buffer.from(key, "base64")).update(`click-ip-salt:${day}`).digest();
  if (!fallbackSalts.has(day)) {
    fallbackSalts.clear();
    fallbackSalts.set(day, randomBytes(32));
  }
  return fallbackSalts.get(day)!;
}

export function hashIp(ip: string, now: Date, key?: string): string {
  return createHmac("sha256", dailySalt(now, key)).update(ip).digest("hex");
}

/** Fills `{subid}` in an affiliate URL with "placement-locale" (for networks that take a sub-ID). */
export function withSubId(url: string, placement: string, locale: string | null): string {
  return url.split("{subid}").join(encodeURIComponent(`${placement}-${locale ?? "xx"}`));
}

export type Target =
  | { kind: "affiliate"; appId: string; linkId: string; url: string }
  | { kind: "app-page"; appId: string; url: string }
  | { kind: "not-found" };

/**
 * Where `/go/{slug}` sends the visitor. Only published apps are reachable. No active link (or a link that can't
 * be decrypted) → our own app page, never a 404, so a dead campaign link still lands somewhere useful.
 */
export async function resolveTarget(
  sql: postgres.Sql,
  slugRaw: string,
  opts: { placement: string; locale: Locale | null; key?: Buffer },
): Promise<Target> {
  const slug = cleanSlug(slugRaw);
  if (!slug) return { kind: "not-found" };
  const [row] = await sql<{ app_id: string; link_id: string | null; url_encrypted: string | null }[]>`
    select a.id as app_id, l.id as link_id, l.url_encrypted
    from apps a left join affiliate_links l on l.app_id = a.id and l.active
    where a.slug = ${slug} and a.status = 'published'`;
  if (!row) return { kind: "not-found" };
  const pageLocale = opts.locale && publishedLocales.includes(opts.locale) ? opts.locale : defaultLocale;
  const appPage = `/${pageLocale}/app/${slug}`;
  if (!row.link_id || !row.url_encrypted) return { kind: "app-page", appId: row.app_id, url: appPage };
  try {
    const plain = opts.key ? decryptLink(row.url_encrypted, opts.key) : decryptLink(row.url_encrypted);
    if (!/^https:\/\//.test(plain)) throw new Error("non-https target");
    return {
      kind: "affiliate",
      appId: row.app_id,
      linkId: row.link_id,
      url: withSubId(plain, opts.placement, opts.locale),
    };
  } catch (err) {
    // Wrong/missing key or tampered ciphertext: fail safe to our own page and say so in the log (no URL, no key).
    console.error("[go] affiliate link unusable:", err instanceof Error ? err.message : "unknown error");
    return { kind: "app-page", appId: row.app_id, url: appPage };
  }
}

export type ClickInput = {
  appId: string;
  linkId: string | null;
  placement: string;
  locale: string | null;
  country: string | null;
  device: string;
  referrerPath: string | null;
  ipHash: string;
  at: Date;
};

/** Logs a click unless this IP hash already logged CLICK_RATE_LIMIT.max clicks in the window. Returns whether it logged. */
export async function logClick(sql: postgres.Sql, c: ClickInput): Promise<boolean> {
  const since = new Date(c.at.getTime() - CLICK_RATE_LIMIT.windowMs);
  const rows = await sql`
    insert into clicks (app_id, link_id, placement, locale, country, device, referrer_path, ip_hash, at)
    select ${c.appId}, ${c.linkId}, ${c.placement}, ${c.locale}, ${c.country}, ${c.device}, ${c.referrerPath}, ${c.ipHash}, ${c.at}
    where (select count(*) from clicks where ip_hash = ${c.ipHash} and at > ${since}) < ${CLICK_RATE_LIMIT.max}
    returning id`;
  return rows.length === 1;
}
