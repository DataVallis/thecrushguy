import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppDetail } from "@/lib/public/catalog";
import { AI_SEARCH_BOTS, llmsTxt, quickAnswers, robotsTxt } from "./geo";
import { appUrls, indexNowBody, pingIndexNow } from "./indexnow";

const SITE = "https://thecrushguy.com";

describe("robots.txt (TASK-017)", () => {
  it("non-prod blocks everything", () => {
    expect(robotsTxt({ indexable: false, site: SITE, blockTraining: false })).toBe("User-agent: *\nDisallow: /\n");
  });
  it("names AI search bots and repeats the disallows in every group", () => {
    const t = robotsTxt({ indexable: true, site: SITE, blockTraining: false });
    for (const b of AI_SEARCH_BOTS) expect(t).toContain(`User-agent: ${b}`);
    expect(t.match(/Disallow: \/go\//g)).toHaveLength(3);
    expect(t).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });
  it("can block training crawlers only", () => {
    const t = robotsTxt({ indexable: true, site: SITE, blockTraining: true });
    const training = t.split("# AI training crawlers")[1]!;
    expect(training).toMatch(/User-agent: GPTBot[\s\S]*Disallow: \/\n/);
    expect(t.split("# AI training crawlers")[0]).not.toMatch(/Disallow: \/\n/);
  });
});

describe("llms.txt", () => {
  it("lists apps by score with facts and the method", () => {
    const t = llmsTxt(
      SITE,
      "en",
      [
        {
          slug: "a",
          name: "A",
          tagline: null,
          overall: 50,
          hasFreePlan: false,
          startingPriceCents: 999,
          currency: "USD",
          reviewMethod: "data",
        },
        {
          slug: "b",
          name: "B",
          tagline: "Chat",
          overall: 80,
          hasFreePlan: true,
          startingPriceCents: null,
          currency: null,
          reviewMethod: "hands_on",
        },
      ],
      [{ slug: "ai-girlfriend-apps", name: "AI girlfriend apps" }],
    );
    expect(t.startsWith("# The Crush Guy\n")).toBe(true);
    expect(t.indexOf("[B]")).toBeLessThan(t.indexOf("[A]"));
    expect(t).toContain(
      "- [A](https://thecrushguy.com/en/app/a): score 5.0/10 (rated from public information), no free plan, paid from $9.99/month",
    );
    expect(t).toContain(`${SITE}/en/how-we-rank`);
  });
});

describe("quick answers", () => {
  const app = {
    name: "Nomi",
    hasFreePlan: true,
    startingPriceCents: 999,
    currency: "USD",
    scoreNotes: { privacy: "Account/data deletion offered; training use of chats not stated (privacy policy)." },
    features: { voice: true, imageGen: false, memory: true, customCharacter: true },
    companyName: "Glimpse.ai",
    companyCountry: "US",
  } as unknown as AppDetail;
  it("answers only from facts we hold", () => {
    const a = quickAnswers(app);
    expect(a[0]).toEqual({ q: "Is Nomi free?", a: "Yes, Nomi has a free plan; paid plans start at $9.99 a month." });
    expect(a.find((x) => x.q === "Is Nomi private?")!.a).toBe(
      "From its privacy policy: Account/data deletion offered; training use of chats not stated.",
    );
    expect(
      quickAnswers({
        ...app,
        hasFreePlan: null,
        startingPriceCents: null,
        scoreNotes: { privacy: null },
        companyName: null,
        features: { voice: false, imageGen: false, memory: false, customCharacter: false },
      } as unknown as AppDetail),
    ).toEqual([]);
  });
});

describe("IndexNow", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("builds the payload with a public key location", () => {
    expect(indexNowBody(SITE, "abcd1234", ["u", "u"])).toEqual({
      host: "thecrushguy.com",
      key: "abcd1234",
      keyLocation: `${SITE}/indexnow-key.txt`,
      urlList: ["u"],
    });
    expect(appUrls(SITE, "nomi-ai")).toContain(`${SITE}/en/app/nomi-ai`);
  });
  it("derives a stable public key from LINK_ENCRYPTION_KEY when INDEXNOW_KEY is unset", async () => {
    const { indexNowKey } = await import("./indexnow");
    vi.stubEnv("INDEXNOW_KEY", "");
    vi.stubEnv("LINK_ENCRYPTION_KEY", "secret-a");
    const k = indexNowKey();
    expect(k).toMatch(/^[0-9a-f]{32}$/);
    expect(k).not.toContain("secret");
    expect(indexNowKey()).toBe(k);
  });
  it("only pings from prod with a key", async () => {
    const f = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubEnv("APP_ENV", "dev");
    vi.stubEnv("INDEXNOW_KEY", "abcd1234");
    expect(await pingIndexNow(["x"], f as unknown as typeof fetch)).toBe(false);
    vi.stubEnv("APP_ENV", "prod");
    vi.stubEnv("SITE_URL", SITE);
    expect(await pingIndexNow(["x"], f as unknown as typeof fetch)).toBe(true);
    expect(f).toHaveBeenCalledOnce();
  });
});
