import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for affiliate URLs (they contain affiliate IDs — CLAUDE.md hard rule: never in plain text).
 * Format: "v1.<iv b64url>.<tag b64url>.<ciphertext b64url>". Key: env LINK_ENCRYPTION_KEY = 32 bytes, base64.
 * Generate: `openssl rand -base64 32`.
 */
const VERSION = "v1";

export function linkKey(raw = process.env.LINK_ENCRYPTION_KEY): Buffer {
  if (!raw) throw new Error("LINK_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("LINK_ENCRYPTION_KEY must be 32 bytes (base64)");
  return key;
}

export function encryptLink(plain: string, key: Buffer = linkKey()): string {
  if (!plain) throw new Error("empty link");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptLink(token: string, key: Buffer = linkKey()): string {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error("invalid link token");
  const [, iv, tag, ct] = parts.map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Non-secret hint for the admin UI: just the host. */
export function linkHint(plain: string): string {
  return new URL(plain).host;
}
