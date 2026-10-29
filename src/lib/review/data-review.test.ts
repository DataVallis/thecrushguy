import { describe, expect, it } from "vitest";
import { overallScore } from "@/lib/public/scoring";
import { computeDataReview } from "./data-review";

const S = "https://example.com/terms";
const y = (src = S) => ({ v: "yes", src });
const n = (src = S) => ({ v: "no", src });
const base = {
  slug: "demo",
  checked_at: "2026-10-29",
  pricing: {
    has_free_plan: y("https://example.com/pricing"),
    starting_price_monthly: { v: 9.99, src: "https://example.com/pricing" },
    currency: "USD",
    billing: "monthly",
    uses_tokens_or_credits: n(),
  },
  features: {
    long_term_memory: y(),
    voice_messages: y(),
    voice_calls: n(),
    image_generation: y(),
    custom_character_creation: y(),
    group_chat: n(),
    nsfw_allowed: n(),
  },
  platforms: { v: ["web", "ios", "android"], src: "https://example.com" },
  privacy: {
    privacy_policy_url: "https://example.com/privacy",
    account_data_deletion: y("https://example.com/privacy"),
    sells_or_shares_for_ads: n("https://example.com/privacy"),
    chats_used_for_training: { v: "unknown", src: "" },
    retention_period_stated: n("https://example.com/privacy"),
  },
  terms: { min_age_18: y(), bans_minor_content: y(), refund_policy_stated: n() },
  operator: { name: { v: "Demo Ltd", src: S }, country: { v: "IE", src: S }, address_stated: y() },
};

describe("computeDataReview (ADR-030)", () => {
  it("computes scores from facts by the published formula", () => {
    const r = computeDataReview("Demo", base);
    expect(r.scores).toEqual({ conversation: null, memory: 80, customization: 70, media: 70, value: 90, privacy: 65 });
    expect(r.startingPriceCents).toBe(999);
    expect(r.checklist).toEqual({ chk18PlusTerms: true, chkPrivacyPolicy: true, chkOperatorIdentifiable: true });
    expect(r.missing).toEqual([]);
    expect(r.pros.length).toBeGreaterThanOrEqual(3);
    expect(r.cons.length).toBeGreaterThanOrEqual(3);
    expect(r.verdict).toContain("not from a hands-on test");
    expect(r.notes.conversation).toMatch(/Not tested/);
  });

  it("ignores any fact without a source URL — it counts as unknown", () => {
    const r = computeDataReview("Demo", {
      ...base,
      features: { ...base.features, long_term_memory: { v: "yes", src: "" } },
      terms: { ...base.terms, min_age_18: { v: "yes", src: "not a url" } },
    });
    expect(r.scores.memory).toBe(30);
    expect(r.checklist.chk18PlusTerms).toBe(false);
    expect(r.sources.every((s) => /^https?:\/\//.test(s.url))).toBe(true);
  });

  it("does not use a price whose billing period is unknown", () => {
    const r = computeDataReview("Demo", { ...base, pricing: { ...base.pricing, billing: "unknown" } });
    expect(r.startingPriceCents).toBeNull();
    expect(r.missing).toContain("a sourced starting price");
  });

  it("never claims the gallery check", () => {
    const r = computeDataReview("Demo", base);
    expect(Object.keys(r.checklist)).not.toContain("chkNoMinorContent");
  });

  it("overall score leaves out the untested conversation criterion", () => {
    const r = computeDataReview("Demo", base);
    // (80*15 + 70*15 + 70*15 + 90*20 + 65*10) / 75 = 76.67
    expect(overallScore(r.scores)).toBe(76.7);
  });
});
