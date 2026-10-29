/**
 * IndexNow (TASK-017): tell Bing (which powers ChatGPT search, Copilot and DuckDuckGo) and Yandex about changed
 * URLs right away. Prod only. The key is a public token served at /indexnow-key.txt: env INDEXNOW_KEY, or derived
 * one-way (HMAC) from LINK_ENCRYPTION_KEY so no extra setup is needed. Fire-and-forget: a failure never breaks a save.
 */
import { createHmac } from "node:crypto";
import { publishedLocales } from "@/i18n/config";
import { isIndexable, siteUrl } from "@/lib/env";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export function indexNowKey(): string | null {
  const k = process.env.INDEXNOW_KEY?.trim();
  if (k && /^[a-zA-Z0-9-]{8,128}$/.test(k)) return k;
  const secret = process.env.LINK_ENCRYPTION_KEY;
  return secret ? createHmac("sha256", secret).update("indexnow-key-v1").digest("hex").slice(0, 32) : null;
}

export function indexNowBody(site: string, key: string, urls: string[]) {
  return { host: new URL(site).host, key, keyLocation: `${site}/indexnow-key.txt`, urlList: [...new Set(urls)] };
}

export function appUrls(site: string, slug: string): string[] {
  return publishedLocales.flatMap((l) => [`${site}/${l}/app/${slug}`, `${site}/${l}`]);
}

export async function pingIndexNow(urls: string[], fetcher: typeof fetch = fetch): Promise<boolean> {
  const key = indexNowKey();
  if (!isIndexable() || !key || !urls.length) return false;
  try {
    const res = await fetcher(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(indexNowBody(siteUrl(), key, urls)),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
