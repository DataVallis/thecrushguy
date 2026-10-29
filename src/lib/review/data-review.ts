/**
 * Data-based reviews (ADR-030, TASK-016). Turns sourced public facts about an app (docs/research/FACTS-BRIEF.md
 * format) into sub-scores, one-line reasons, pros, cons and a verdict — deterministically, so every number on the
 * page traces back to a fact with a source URL. Nothing here is an opinion about chat quality: the conversation
 * sub-score stays empty ("not tested") until a hands-on review replaces the data review.
 *
 * Rules: a fact counts only with an http(s) source; "unknown" (not stated) never earns points and is never shown as
 * a weakness of the app — only as "not stated" where that is the honest reading (privacy).
 */
import { z } from "zod";
import { PLATFORMS } from "@/lib/db/platforms";
import type { Scores } from "@/lib/public/scoring";

const isUrl = (v: string) => /^https?:\/\/\S+$/.test(v) && URL.canParse(v);
const fact = <T extends z.ZodType>(schema: T) =>
  z.object({ v: z.unknown(), src: z.string().default(""), q: z.string().optional() }).transform((f) => {
    const parsed = schema.safeParse(f.v);
    const ok = isUrl(f.src) && parsed.success;
    return { v: ok ? (parsed.data as z.output<T>) : ("unknown" as const), src: ok ? f.src : "", q: f.q };
  });
const yn = fact(z.enum(["yes", "no", "unknown"]).catch("unknown"));
const unknownFact = { v: "unknown" as const, src: "" };
const optYn = yn.optional().transform((f) => f ?? unknownFact);

export const factsSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  checked_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pricing: z.object({
    has_free_plan: optYn,
    free_plan_limits: fact(z.string()).optional(),
    starting_price_monthly: fact(z.union([z.number().nonnegative(), z.literal("unknown")]).catch("unknown")).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional()
      .catch(undefined),
    billing: z.enum(["monthly", "annual", "unknown"]).catch("unknown").default("unknown"),
    uses_tokens_or_credits: optYn,
  }),
  features: z.object({
    long_term_memory: optYn,
    voice_messages: optYn,
    voice_calls: optYn,
    image_generation: optYn,
    custom_character_creation: optYn,
    group_chat: optYn,
    nsfw_allowed: optYn,
  }),
  platforms: fact(z.array(z.string()).catch([])).optional(),
  privacy: z.object({
    privacy_policy_url: z.string().default(""),
    account_data_deletion: optYn,
    sells_or_shares_for_ads: optYn,
    chats_used_for_training: fact(z.enum(["yes", "no", "opt-out", "unknown"]).catch("unknown"))
      .optional()
      .transform((f) => f ?? unknownFact),
    retention_period_stated: optYn,
  }),
  terms: z.object({
    min_age_18: optYn,
    bans_minor_content: optYn,
    refund_policy_stated: optYn,
    age_verification: fact(z.string()).optional(),
  }),
  operator: z.object({
    name: fact(z.string()).optional(),
    country: fact(z.string()).optional(),
    address_stated: optYn,
  }),
  notes: z.string().optional(),
});
export type Facts = z.output<typeof factsSchema>;

export type DataReview = {
  scores: Scores;
  notes: Record<keyof Scores, string>;
  pros: string[];
  cons: string[];
  verdict: string;
  hasFreePlan: boolean | null;
  startingPriceCents: number | null;
  currency: string | null;
  platforms: string[];
  features: { voice: boolean; imageGen: boolean; memory: boolean; groupChat: boolean; customCharacter: boolean };
  nsfwAllowed: boolean;
  companyName: string | null;
  companyCountry: string | null;
  privacyPolicyUrl: string | null;
  /** Checklist items that public facts can settle (07-LEGAL §2). "No minor-coded content" is never set here. */
  checklist: { chk18PlusTerms: boolean; chkPrivacyPolicy: boolean; chkOperatorIdentifiable: boolean };
  /** Every source URL used, with the field it supports — stored in `sources`. */
  sources: { url: string; field: string }[];
  /** Things the review cannot be published without (quality gate adds its own checks). */
  missing: string[];
};

const yes = (f: { v: unknown }) => f.v === "yes";
const no = (f: { v: unknown }) => f.v === "no";
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function formatPrice(cents: number, currency: string): string {
  const sym: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };
  const amount = (cents / 100).toFixed(2);
  return sym[currency] ? `${sym[currency]}${amount}` : `${amount} ${currency}`;
}

/** Value: free plan + monthly entry price bands. Points per band are documented on /how-we-rank. */
export const PRICE_BANDS: [maxMonthly: number, points: number][] = [
  [5, 60],
  [10, 50],
  [15, 40],
  [20, 25],
  [30, 15],
  [Infinity, 5],
];

/** Human labels for the `sources.field` column (shown on the public page). */
const LABELS: Record<string, string> = {
  long_term_memory: "long-term memory",
  voice_messages: "voice messages",
  voice_calls: "voice calls",
  image_generation: "image generation",
  custom_character_creation: "custom characters",
  group_chat: "group chats",
  nsfw_allowed: "adult content setting",
  account_data_deletion: "account & data deletion",
  sells_or_shares_for_ads: "data sharing for ads",
  chats_used_for_training: "AI training on chats",
  retention_period_stated: "data retention",
  min_age_18: "18+ requirement",
  bans_minor_content: "content rules",
  refund_policy_stated: "refund policy",
  age_verification: "age verification",
};

export function computeDataReview(name: string, raw: unknown): DataReview {
  const f = factsSchema.parse(raw);
  const sources: DataReview["sources"] = [];
  const cite = (src: string | undefined, field: string) => {
    if (src && isUrl(src) && !sources.some((s) => s.url === src && s.field === field))
      sources.push({ url: src, field });
  };
  const p = f.pricing;
  // A price only counts when its billing period is known (monthly, or annual shown per month).
  const price =
    p.starting_price_monthly && typeof p.starting_price_monthly.v === "number" && p.billing !== "unknown"
      ? p.starting_price_monthly
      : null;
  const currency = price && p.currency ? p.currency : null;
  const priceCents = price && currency ? Math.round((price.v as number) * 100) : null;
  const priceText = priceCents !== null && currency ? formatPrice(priceCents, currency) : null;
  const missing: string[] = [];
  if (priceCents === null) missing.push("a sourced starting price");
  if (p.has_free_plan.v === "unknown") missing.push("free plan yes/no");

  // Value
  let value = yes(p.has_free_plan) ? 40 : 0;
  if (price) value += PRICE_BANDS.find(([max]) => (price.v as number) <= max)![1];
  if (yes(p.uses_tokens_or_credits)) value -= 10;
  const valueNote = [
    yes(p.has_free_plan) ? "Free plan available" : no(p.has_free_plan) ? "No free plan" : "Free plan not stated",
    priceText
      ? `paid from ${priceText}/month${p.billing === "annual" ? " (billed yearly)" : ""}`
      : "price not published",
    yes(p.uses_tokens_or_credits) ? "some features use tokens/credits" : null,
  ]
    .filter(Boolean)
    .join("; ");
  cite(p.has_free_plan.src, "free plan");
  if (price) cite(price.src, "pricing");
  cite(p.uses_tokens_or_credits.src, "tokens/credits");

  // Feature-based sub-scores: "advertised by the app", not tested quality.
  const ft = f.features;
  for (const [k, fa] of Object.entries(ft)) cite(fa.src, LABELS[k] ?? k);
  const memory = yes(ft.long_term_memory) ? 80 : no(ft.long_term_memory) ? 10 : 30;
  const customization = (yes(ft.custom_character_creation) ? 70 : 0) + (yes(ft.group_chat) ? 30 : 0);
  const media =
    (yes(ft.voice_messages) ? 30 : 0) + (yes(ft.voice_calls) ? 30 : 0) + (yes(ft.image_generation) ? 40 : 0);
  const listOf = (items: [boolean, string][]) => items.filter(([on]) => on).map(([, t]) => t);
  const mediaList = listOf([
    [yes(ft.voice_messages), "voice messages"],
    [yes(ft.voice_calls), "voice calls"],
    [yes(ft.image_generation), "image generation"],
  ]);

  // Privacy
  const pr = f.privacy;
  const training = pr.chats_used_for_training.v;
  const privacy =
    (yes(pr.account_data_deletion) ? 30 : 0) +
    (no(pr.sells_or_shares_for_ads) ? 25 : 0) +
    (training === "no" ? 25 : training === "opt-out" ? 15 : 0) +
    (yes(pr.retention_period_stated) ? 10 : 0) +
    (yes(f.operator.address_stated) ? 10 : 0);
  for (const [k, fa] of Object.entries(pr)) if (typeof fa === "object") cite(fa.src, LABELS[k] ?? k);
  const privacyUrl = isUrl(pr.privacy_policy_url) ? pr.privacy_policy_url : null;
  if (privacyUrl) cite(privacyUrl, "privacy policy");
  else missing.push("privacy policy URL");
  const privacyNote =
    [
      yes(pr.account_data_deletion) ? "account/data deletion offered" : "no deletion option stated",
      no(pr.sells_or_shares_for_ads)
        ? "says it does not sell or share data for ads"
        : yes(pr.sells_or_shares_for_ads)
          ? "shares data for advertising"
          : null,
      training === "no"
        ? "says chats are not used for training"
        : training === "opt-out"
          ? "training on chats can be switched off"
          : training === "yes"
            ? "chats may be used for training"
            : "training use of chats not stated",
    ]
      .filter(Boolean)
      .join("; ") + " (privacy policy)";

  const platforms = ((f.platforms?.v ?? []) as string[])
    .map((x: string) => x.toLowerCase())
    .filter((x: string) => (PLATFORMS as readonly string[]).includes(x));
  if (f.platforms) cite(f.platforms.src, "platforms");
  const op = f.operator;
  const opName = op.name && op.name.v !== "unknown" && op.name.v.trim() ? op.name.v.trim() : null;
  const opCountry = op.country && /^[A-Z]{2}$/.test(op.country.v) ? op.country.v : null;
  if (op.name) cite(op.name.src, "operator");
  cite(op.address_stated.src, "operator address");
  for (const [k, fa] of Object.entries(f.terms)) if (fa && typeof fa === "object") cite(fa.src, LABELS[k] ?? k);

  // Pros and cons — plain facts, strongest first.
  const pros = [
    yes(p.has_free_plan)
      ? `Free plan${p.free_plan_limits && p.free_plan_limits.v !== "unknown" ? ` (${p.free_plan_limits.v})` : ""}`
      : null,
    price && (price.v as number) <= 10 && priceText ? `Low entry price: ${priceText}/month` : null,
    yes(ft.long_term_memory) ? "Advertises long-term memory" : null,
    mediaList.length ? `Offers ${mediaList.join(", ")}` : null,
    yes(ft.custom_character_creation) ? "Create your own characters" : null,
    yes(pr.account_data_deletion) ? "You can delete your account and data" : null,
    no(pr.sells_or_shares_for_ads) ? "Says it does not sell or share your data for ads" : null,
    training === "no" ? "Says chats are not used to train AI" : null,
    platforms.length >= 3 ? `Available on ${platforms.join(", ")}` : null,
  ].filter((x): x is string => !!x);
  const cons = [
    no(p.has_free_plan) ? "No free plan" : null,
    price && (price.v as number) > 15 && priceText ? `Pricey entry plan: ${priceText}/month` : null,
    yes(p.uses_tokens_or_credits) ? "Some features cost extra tokens/credits" : null,
    training === "yes" ? "Chats may be used to train AI models" : null,
    yes(pr.sells_or_shares_for_ads) ? "Shares data for advertising" : null,
    !yes(pr.account_data_deletion) ? "No account/data deletion option stated in the privacy policy" : null,
    !yes(op.address_stated) ? "We couldn't find the operator's address" : null,
    !yes(f.terms.refund_policy_stated) ? "No refund policy found" : null,
    mediaList.length === 0 ? "No voice or image features advertised" : null,
    training === "unknown" ? "Privacy policy doesn't say whether chats are used to train AI" : null,
    !yes(pr.retention_period_stated) ? "No data-retention period stated" : null,
    f.platforms && platforms.length && !platforms.includes("web") ? "No web version" : null,
    f.platforms && platforms.length && !platforms.includes("ios") && !platforms.includes("android")
      ? "No mobile app"
      : null,
  ].filter((x): x is string => !!x);
  if (pros.length < 3) missing.push("3 pros (not enough positive facts)");
  if (cons.length < 3) missing.push("3 cons");

  const scores: Scores = {
    conversation: null,
    memory,
    customization: clamp(customization),
    media: clamp(media),
    value: clamp(value),
    privacy: clamp(privacy),
  };
  const notes: Record<keyof Scores, string> = {
    conversation: "Not tested hands-on yet — chat quality can't be judged from public information.",
    memory: yes(ft.long_term_memory)
      ? "Long-term memory is advertised (not yet tested)."
      : no(ft.long_term_memory)
        ? "No long-term memory."
        : "Long-term memory not stated by the app.",
    customization:
      listOf([
        [yes(ft.custom_character_creation), "custom characters"],
        [yes(ft.group_chat), "group chats"],
      ]).join(" and ") || "No character creation or group chats advertised.",
    media: mediaList.length ? `Advertises ${mediaList.join(", ")}.` : "No voice or image features advertised.",
    value: `${valueNote}.`,
    privacy: `${privacyNote[0]!.toUpperCase()}${privacyNote.slice(1)}.`,
  };
  if (notes.customization && !notes.customization.endsWith(".")) notes.customization = `Offers ${notes.customization}.`;

  const date = new Date(`${f.checked_at}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const verdict = [
    `We rated ${name} from public information checked on ${date} — its pricing page, privacy policy, terms and store listings — not from a hands-on test.`,
    yes(p.has_free_plan)
      ? `There is a free plan${priceText ? `, and paid plans start at ${priceText} a month` : ""}.`
      : priceText
        ? `There is no free plan; paid plans start at ${priceText} a month.`
        : "",
    pros[0] && cons[0]
      ? `Its strongest point on paper: ${pros[0].toLowerCase()}. The main caveat: ${cons[0].toLowerCase()}.`
      : "",
    "Chat quality is not scored until we test it ourselves, and features are rated as advertised.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    scores,
    notes,
    pros: pros.slice(0, 5),
    cons: cons.slice(0, 5),
    verdict,
    hasFreePlan: yes(p.has_free_plan) ? true : no(p.has_free_plan) ? false : null,
    startingPriceCents: priceCents,
    currency,
    platforms,
    features: {
      voice: yes(ft.voice_messages) || yes(ft.voice_calls),
      imageGen: yes(ft.image_generation),
      memory: yes(ft.long_term_memory),
      groupChat: yes(ft.group_chat),
      customCharacter: yes(ft.custom_character_creation),
    },
    nsfwAllowed: yes(ft.nsfw_allowed),
    companyName: opName,
    companyCountry: opCountry,
    privacyPolicyUrl: privacyUrl,
    checklist: {
      chk18PlusTerms: yes(f.terms.min_age_18),
      chkPrivacyPolicy: !!privacyUrl,
      chkOperatorIdentifiable: !!opName && (yes(op.address_stated) || !!opCountry),
    },
    sources,
    missing,
  };
}
