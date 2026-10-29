import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/age-gate/route";
import {
  DEFAULT_RESTRICTED,
  gateDecision,
  regionFromHeaders,
  restrictedRegions,
  safeReturnPath,
  selfDeclaration,
} from "./policy";
import { GatedContent } from "./view";

const SI = { country: "SI", subdivision: null };

describe("gateDecision", () => {
  it("allowed region: no cookie → gate, verified → show", () => {
    expect(gateDecision(SI, false)).toBe("gate");
    expect(gateDecision(SI, true)).toBe("show");
  });

  it("restricted countries and subdivisions are blocked even when verified", () => {
    const r = restrictedRegions("GB,US-TX");
    expect(gateDecision({ country: "GB", subdivision: null }, true, r)).toBe("blocked");
    expect(gateDecision({ country: "US", subdivision: "TX" }, true, r)).toBe("blocked");
    expect(gateDecision({ country: "US", subdivision: "CA" }, true, r)).toBe("show");
  });

  it("unknown location fails closed (blocked)", () => {
    expect(gateDecision({ country: null, subdivision: null }, true)).toBe("blocked");
  });

  it("default restricted list applies when the env var is unset or blank; invalid entries are ignored", () => {
    expect([...restrictedRegions(undefined)]).toEqual([...DEFAULT_RESTRICTED]);
    expect([...restrictedRegions("  ")]).toEqual([...DEFAULT_RESTRICTED]);
    expect([...restrictedRegions("gb, us-tx, nonsense, 1")]).toEqual(["GB", "US-TX"]);
  });

  it("reads Cloudflare location headers; XX/T1/garbage → unknown", () => {
    const h = (m: Record<string, string>) => (n: string) => m[n] ?? null;
    expect(regionFromHeaders(h({ "cf-ipcountry": "si" }))).toEqual({ country: "SI", subdivision: null });
    expect(regionFromHeaders(h({ "cf-ipcountry": "US", "cf-region-code": "tx" }))).toEqual({
      country: "US",
      subdivision: "TX",
    });
    for (const c of ["XX", "T1", "USA", ""]) expect(regionFromHeaders(h({ "cf-ipcountry": c })).country).toBeNull();
  });

  it("self-declaration provider: only age_ok=1 counts", () => {
    expect(selfDeclaration.isVerified((n) => (n === "age_ok" ? "1" : undefined))).toBe(true);
    for (const v of [undefined, "0", "true", "11"]) expect(selfDeclaration.isVerified(() => v)).toBe(false);
  });
});

describe("GatedContent (same markup for bots and humans without the cookie — no cloaking)", () => {
  const nsfw = <p>NSFW-DETAILS</p>;
  it("gate: SFW notice + confirm form, no gated content", () => {
    const html = renderToStaticMarkup(
      <GatedContent decision="gate" returnTo="/en/app/x">
        {nsfw}
      </GatedContent>,
    );
    expect(html).toContain('data-age-gate="gate"');
    expect(html).toContain('action="/api/age-gate"');
    expect(html).toContain('value="/en/app/x"');
    expect(html).not.toContain("NSFW-DETAILS");
  });
  it("show: the content", () => {
    expect(
      renderToStaticMarkup(
        <GatedContent decision="show" returnTo="/">
          {nsfw}
        </GatedContent>,
      ),
    ).toBe("<p>NSFW-DETAILS</p>");
  });
  it("blocked: region notice, no form, no content", () => {
    const html = renderToStaticMarkup(
      <GatedContent decision="blocked" returnTo="/">
        {nsfw}
      </GatedContent>,
    );
    expect(html).toContain('data-age-gate="blocked"');
    expect(html).not.toContain("<form");
    expect(html).not.toContain("NSFW-DETAILS");
  });
  it("an unsafe return path is replaced before it reaches the form", () => {
    expect(
      renderToStaticMarkup(
        <GatedContent decision="gate" returnTo="//evil.test">
          {nsfw}
        </GatedContent>,
      ),
    ).toContain('value="/"');
  });
});

describe("safeReturnPath", () => {
  it("allows local paths only", () => {
    expect(safeReturnPath("/en/app/x?y=1")).toBe("/en/app/x?y=1");
    for (const bad of [
      "//evil.test",
      "https://evil.test",
      "/\\evil.test",
      "evil",
      "",
      null,
      5,
      "/a\r\nSet-Cookie: x=1",
      `/${"a".repeat(600)}`,
    ])
      expect(safeReturnPath(bad)).toBe("/");
  });
});

describe("POST /api/age-gate", () => {
  const saved = process.env.SITE_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = saved;
  });
  const post = (fields: Record<string, string>, origin?: string) => {
    const body = new URLSearchParams(fields);
    return POST(
      new Request("https://dev.thecrushguy.com/api/age-gate", {
        method: "POST",
        body,
        headers: { "content-type": "application/x-www-form-urlencoded", ...(origin ? { origin } : {}) },
      }),
    );
  };

  it("confirm=yes sets an httpOnly, Secure (https site) 30-day cookie and returns to the local path", async () => {
    process.env.SITE_URL = "https://dev.thecrushguy.com";
    const res = await post({ confirm: "yes", next: "/en/app/x" }, "https://dev.thecrushguy.com");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://dev.thecrushguy.com/en/app/x");
    expect(res.headers.get("set-cookie")).toBe("age_ok=1; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure");
  });

  it("without confirm=yes no cookie is set; open redirects are neutralised", async () => {
    process.env.SITE_URL = "https://dev.thecrushguy.com";
    const res = await post({ next: "//evil.test/x" });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("location")).toBe("https://dev.thecrushguy.com/");
  });

  it("cross-site POST is refused", async () => {
    process.env.SITE_URL = "https://dev.thecrushguy.com";
    const res = await post({ confirm: "yes" }, "https://evil.test");
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
