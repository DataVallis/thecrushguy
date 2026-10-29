import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptLink, encryptLink, linkHint, linkKey } from "@/lib/crypto/link-cipher";

const key = randomBytes(32);
const url = "https://partner.example.com/?aff=SECRET123&sub=home";

describe("link cipher", () => {
  it("round-trips and never contains the plain URL or affiliate id", () => {
    const token = encryptLink(url, key);
    expect(decryptLink(token, key)).toBe(url);
    expect(token).not.toContain("SECRET123");
    expect(token.startsWith("v1.")).toBe(true);
  });

  it("uses a fresh IV every time", () => {
    expect(encryptLink(url, key)).not.toBe(encryptLink(url, key));
  });

  it("rejects a tampered ciphertext", () => {
    const [v, iv, tag, ct] = encryptLink(url, key).split(".");
    const flipped = Buffer.from(ct, "base64url");
    flipped[0] ^= 1;
    expect(() => decryptLink([v, iv, tag, flipped.toString("base64url")].join("."), key)).toThrow();
  });

  it("rejects the wrong key", () => {
    expect(() => decryptLink(encryptLink(url, key), randomBytes(32))).toThrow();
  });

  it("rejects malformed tokens and empty input", () => {
    expect(() => decryptLink("v2.a.b.c", key)).toThrow("invalid link token");
    expect(() => decryptLink("nope", key)).toThrow("invalid link token");
    expect(() => encryptLink("", key)).toThrow("empty link");
  });

  it("validates the key from env", () => {
    expect(() => linkKey(undefined)).toThrow("LINK_ENCRYPTION_KEY is not set");
    expect(() => linkKey(randomBytes(31).toString("base64"))).toThrow("32 bytes");
    expect(() => linkKey(randomBytes(33).toString("base64"))).toThrow("32 bytes");
    expect(linkKey(randomBytes(32).toString("base64"))).toHaveLength(32);
  });

  it("gives a host-only hint", () => {
    expect(linkHint(url)).toBe("partner.example.com");
  });
});
