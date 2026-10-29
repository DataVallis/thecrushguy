/**
 * Server-side validation of admin form input (TASK-011c). Every admin write goes through these schemas;
 * the database constraints (TASK-011a) are the second line of defence.
 */
import { z } from "zod";
import { PLATFORMS } from "@/lib/db/platforms";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Empty string / missing → null; otherwise trimmed. */
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Must be an http(s) URL");

const optUrl = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))
  .pipe(httpUrl.nullable());

/** "" → null, otherwise an integer in [min, max]. */
const optInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .nullish()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!/^-?\d+$/.test(v)) {
        ctx.addIssue({ code: "custom", message: "Must be a whole number" });
        return z.NEVER;
      }
      return Number(v);
    })
    .pipe(z.number().int().min(min).max(max).nullable());

/** Prices are typed as decimal major units ("9.99") and stored as integer cents — never floats (DEVELOPMENT-RULES §10). */
export const priceToCents = z
  .string()
  .trim()
  .nullish()
  .transform((v, ctx) => {
    if (!v) return null;
    const m = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(v);
    if (!m) {
      ctx.addIssue({ code: "custom", message: "Price like 9.99" });
      return z.NEVER;
    }
    return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
  });

const bool = z.boolean();
const score = optInt(0, 100);

export const appInput = z
  .object({
    slug: z.string().trim().min(1).max(80).regex(SLUG, "lowercase-kebab-case"),
    name: z.string().trim().min(1).max(120),
    tagline: optText(200),
    descriptionMd: optText(20000),
    websiteUrl: httpUrl,
    platforms: z.array(z.enum(PLATFORMS)).max(PLATFORMS.length),
    hasFreePlan: z.enum(["yes", "no", "unknown"]).transform((v) => (v === "unknown" ? null : v === "yes")),
    startingPriceCents: priceToCents,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .nullish()
      .transform((v) => (v ? v : null))
      .pipe(
        z
          .string()
          .regex(/^[A-Z]{3}$/, "ISO code like EUR")
          .nullable(),
      ),
    featVoice: bool,
    featImageGen: bool,
    featVideo: bool,
    featLongTermMemory: bool,
    featGroupChat: bool,
    featCustomCharacter: bool,
    featApi: bool,
    nsfwAllowed: bool,
    nsfwRequiresToggle: bool,
    companyName: optText(200),
    companyCountry: z
      .string()
      .trim()
      .toUpperCase()
      .nullish()
      .transform((v) => (v ? v : null))
      .pipe(
        z
          .string()
          .regex(/^[A-Z]{2}$/, "ISO country like DE")
          .nullable(),
      ),
    privacyPolicyUrl: optUrl,
    scoreConversation: score,
    scoreMemory: score,
    scoreCustomization: score,
    scoreMedia: score,
    scoreValue: score,
    scorePrivacy: score,
    chk18PlusTerms: bool,
    chkNoMinorContent: bool,
    chkNoDeepfakeFeature: bool,
    chkPrivacyPolicy: bool,
    chkOperatorIdentifiable: bool,
    checklistNote: optText(2000),
    categoryIds: z.array(z.uuid()).max(50),
  })
  .refine((a) => a.startingPriceCents === null || a.currency !== null, {
    message: "Currency is required with a price",
    path: ["currency"],
  });

export type AppInput = z.output<typeof appInput>;

export const statusInput = z
  .object({
    status: z.enum(["draft", "published", "paused", "removed"]),
    removalReason: optText(2000),
  })
  .refine((s) => s.status !== "removed" || s.removalReason !== null, {
    message: "A removal reason is required",
    path: ["removalReason"],
  });

export const categoryInput = z.object({
  slug: z.string().trim().min(1).max(80).regex(SLUG, "lowercase-kebab-case"),
  name: z.string().trim().min(1).max(120),
  description: optText(2000),
  parentId: z
    .string()
    .nullish()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
  sort: optInt(-1000, 1000).transform((v) => v ?? 0),
  isNsfw: bool,
});

export type CategoryInput = z.output<typeof categoryInput>;

const BOOL_FIELDS = new Set([
  "featVoice",
  "featImageGen",
  "featVideo",
  "featLongTermMemory",
  "featGroupChat",
  "featCustomCharacter",
  "featApi",
  "nsfwAllowed",
  "nsfwRequiresToggle",
  "chk18PlusTerms",
  "chkNoMinorContent",
  "chkNoDeepfakeFeature",
  "chkPrivacyPolicy",
  "chkOperatorIdentifiable",
  "isNsfw",
  "active",
]);
const ARRAY_FIELDS = new Set(["platforms", "categoryIds"]);

/**
 * FormData → plain object for zod. Checkboxes: present = true, absent = false. Multi-value fields → arrays.
 * Only keys named in `fields` are read — anything else the client sends is ignored (no mass assignment).
 */
export function formToObject(form: FormData, fields: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (BOOL_FIELDS.has(f)) out[f] = form.get(f) !== null;
    else if (ARRAY_FIELDS.has(f)) out[f] = form.getAll(f).filter((v): v is string => typeof v === "string");
    else {
      const v = form.get(f);
      out[f] = typeof v === "string" ? v : undefined;
    }
  }
  return out;
}

export const APP_FIELDS: readonly string[] = [
  "slug",
  "name",
  "tagline",
  "descriptionMd",
  "websiteUrl",
  "platforms",
  "hasFreePlan",
  "startingPriceCents",
  "currency",
  ...[...BOOL_FIELDS].filter((f) => f !== "isNsfw" && f !== "active"),
  "companyName",
  "companyCountry",
  "privacyPolicyUrl",
  "scoreConversation",
  "scoreMemory",
  "scoreCustomization",
  "scoreMedia",
  "scoreValue",
  "scorePrivacy",
  "checklistNote",
  "categoryIds",
];

export const CATEGORY_FIELDS = ["slug", "name", "description", "parentId", "sort", "isNsfw"] as const;

/** Flat field → first message map for the form. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "_form");
    out[key] ??= issue.message;
  }
  return out;
}
