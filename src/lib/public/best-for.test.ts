import { describe, expect, it } from "vitest";
import { bestForLabels } from "./best-for";
import type { AppCard } from "./catalog";

const app = (slug: string, o: Partial<AppCard> = {}): AppCard => ({
  slug,
  name: slug,
  tagline: null,
  overall: 50,
  hasFreePlan: false,
  startingPriceCents: null,
  currency: null,
  features: { voice: false, imageGen: false, memory: false },
  greenFlag: null,
  redFlag: null,
  reviewMethod: "data",
  ...o,
});

describe("bestForLabels", () => {
  it("skips the top pick, gives one label per app, compares USD prices only", () => {
    const all = { voice: true, imageGen: true, memory: true };
    const ranked = [
      app("top", { hasFreePlan: true, features: all, startingPriceCents: 100, currency: "USD" }),
      app("b", { hasFreePlan: true, features: all }),
      app("c", { features: all }),
      app("d", { features: { voice: false, imageGen: true, memory: true } }),
      app("e", { startingPriceCents: 300, currency: "EUR" }),
      app("f", { startingPriceCents: 999, currency: "USD" }),
      app("g", { startingPriceCents: 599, currency: "USD", features: { voice: false, imageGen: false, memory: true } }),
    ];
    expect(bestForLabels(ranked)).toEqual({ b: "free", c: "voice", d: "pictures", g: "memory", f: "cheap" });
  });
  it("returns nothing for an empty list", () => {
    expect(bestForLabels([])).toEqual({});
  });
});
