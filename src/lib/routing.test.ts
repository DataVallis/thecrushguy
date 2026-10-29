import { describe, expect, it } from "vitest";
import { negotiateLocale } from "@/i18n/config";
import { localeRedirect, needsLocale } from "@/lib/routing";

describe("needsLocale", () => {
  it.each(["/", "/category/ai-girlfriend", "/how-we-rank"])("prefixes %s", (p) => {
    expect(needsLocale(p)).toBe(true);
  });
  it.each([
    "/en",
    "/en/app/x",
    "/de",
    "/api/health",
    "/go/candy-ai",
    "/admin",
    "/admin/apps",
    "/robots.txt",
    "/favicon.ico",
    "/logo.svg",
  ])("leaves %s alone", (p) => {
    expect(needsLocale(p)).toBe(false);
  });
  it("does not treat a lookalike segment as a locale", () => {
    expect(needsLocale("/english")).toBe(true);
    expect(needsLocale("/enx/app")).toBe(true);
  });
});

describe("negotiateLocale", () => {
  it("defaults to en without a header", () => {
    expect(negotiateLocale(null)).toBe("en");
  });
  it("never picks an unpublished locale (de is a scaffold test locale)", () => {
    expect(negotiateLocale("de-AT,de;q=0.9")).toBe("en");
  });
  it("ignores q=0 and garbage", () => {
    expect(negotiateLocale("xx;q=1, en;q=0")).toBe("en");
  });
});

describe("localeRedirect", () => {
  it("redirects root to the default locale", () => {
    expect(localeRedirect("/", null)).toBe("/en");
  });
  it("keeps the rest of the path", () => {
    expect(localeRedirect("/category/free", "en-US")).toBe("/en/category/free");
  });
  it("returns null for localized and unlocalized paths", () => {
    expect(localeRedirect("/en/category/free", null)).toBeNull();
    expect(localeRedirect("/go/candy-ai", null)).toBeNull();
  });
});
