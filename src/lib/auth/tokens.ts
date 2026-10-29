import { createHash, createHmac, randomBytes } from "node:crypto";

/** 32 random bytes, URL-safe. Returned to the user once (link or cookie); only its hash is stored. */
export function newRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Raw tokens we issue are exactly 43 base64url chars; anything else is rejected before touching the DB. */
export function isWellFormedToken(raw: unknown): raw is string {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{43}$/.test(raw);
}

// Client IPs are only ever stored as an HMAC with a random, in-memory salt that rotates every 24 h
// (02-ARCHITECTURE "hash + rotating salt"). A restart also rotates it — acceptable: rate windows are ≤ 1 h.
let salt = { value: randomBytes(32), createdAt: Date.now() };
const SALT_TTL_MS = 24 * 60 * 60 * 1000;

export function ipBucket(ip: string, now = Date.now()): string {
  if (now - salt.createdAt > SALT_TTL_MS) salt = { value: randomBytes(32), createdAt: now };
  return `ip:${createHmac("sha256", salt.value).update(ip).digest("hex")}`;
}

export function emailBucket(email: string): string {
  return `email:${createHash("sha256").update(email).digest("hex")}`;
}
