/**
 * GEO — optimisation for AI search/answer engines (TASK-017, ADR-031): robots rules that name the AI crawlers,
 * `/llms.txt`, and fact-based quick answers for app pages. Facts only — every answer is built from fields that
 * carry a source (ADR-030); nothing here invents claims.
 */
import type postgres from "postgres";
import { INFO } from "@/content/info-pages";
import { formatPrice } from "@/lib/review/data-review";
import { overallScore, toTen } from "@/lib/public/scoring";
import type { AppDetail } from "@/lib/public/catalog";

/** Crawlers that fetch pages to answer a user's question right now (search/answer engines). */
export const AI_SEARCH_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
  "DuckAssistBot",
] as const;
/** Crawlers that collect training data; allowed unless env AI_TRAINING_BOTS=block (ADR-031). */
export const AI_TRAINING_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot"] as const;

const DISALLOW = ["/go/", "/api/", "/admin"];

export function robotsTxt(opts: { indexable: boolean; site: string; blockTraining: boolean }): string {
  if (!opts.indexable) return "User-agent: *\nDisallow: /\n";
  const rules = (allow: boolean) =>
    allow ? ["Allow: /", ...DISALLOW.map((d) => `Disallow: ${d}`)].join("\n") : "Disallow: /";
  // A crawler that matches a named group ignores the `*` group, so every group repeats the disallows.
  return (
    [
      `User-agent: *\n${rules(true)}`,
      `# AI search and answer engines: welcome (cite us, link to us)\n${AI_SEARCH_BOTS.map((b) => `User-agent: ${b}`).join("\n")}\n${rules(true)}`,
      `# AI training crawlers\n${AI_TRAINING_BOTS.map((b) => `User-agent: ${b}`).join("\n")}\n${rules(!opts.blockTraining)}`,
      `Sitemap: ${opts.site}/sitemap.xml`,
    ].join("\n\n") + "\n"
  );
}

type LlmsApp = {
  slug: string;
  name: string;
  tagline: string | null;
  overall: number;
  hasFreePlan: boolean | null;
  startingPriceCents: number | null;
  currency: string | null;
  reviewMethod: string;
};

/** llms.txt (llmstxt.org): what the site is, how we rate, and every published app with its key facts. */
export function llmsTxt(site: string, locale: string, apps: LlmsApp[], categories: { slug: string; name: string }[]) {
  const line = (a: LlmsApp) => {
    const facts = [
      `score ${toTen(a.overall)}/10 (${a.reviewMethod === "data" ? "rated from public information" : "tested hands-on"})`,
      a.hasFreePlan === true ? "free plan" : a.hasFreePlan === false ? "no free plan" : null,
      a.startingPriceCents !== null && a.currency
        ? `paid from ${formatPrice(a.startingPriceCents, a.currency)}/month`
        : null,
    ].filter(Boolean);
    return `- [${a.name}](${site}/${locale}/app/${a.slug}): ${a.tagline ? `${a.tagline} — ` : ""}${facts.join(", ")}`;
  };
  return [
    "# The Crush Guy",
    "",
    "> Independent directory and reviews of AI companion apps (AI girlfriend/boyfriend, character and roleplay chat). Every price, feature and privacy fact links to its source with the date we checked it. Scores follow a published formula; commissions never change a score or a ranking.",
    "",
    'Pages labelled "rated from public information" were not tested hands-on; their chat-quality criterion is not scored. Adults (18+) only; we never list apps with minor-coded content or deepfakes of real people.',
    "",
    "## Method",
    `- [${INFO["how-we-rank"].title}](${site}/${locale}/how-we-rank): criteria, weights and the formula for public-information ratings`,
    `- [${INFO["affiliate-disclosure"].title}](${site}/${locale}/affiliate-disclosure)`,
    `- [${INFO.about.title}](${site}/${locale}/about)`,
    "",
    "## Categories",
    ...categories.map((c) => `- [${c.name}](${site}/${locale}/category/${c.slug})`),
    "",
    "## Apps",
    ...[...apps].sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name)).map(line),
    "",
  ].join("\n");
}

export async function loadLlmsData(db: postgres.Sql) {
  const [rows, cats] = await Promise.all([
    db<Record<string, unknown>[]>`select * from apps where status = 'published'`,
    db<{ slug: string; name: string }[]>`
      select distinct c.slug, c.name, c.sort from categories c join app_categories ac on ac.category_id = c.id
      join apps a on a.id = ac.app_id and a.status = 'published' where not c.is_nsfw order by c.sort, c.name`,
  ]);
  const apps: LlmsApp[] = rows.map((r) => ({
    slug: r.slug as string,
    name: r.name as string,
    tagline: (r.tagline as string | null) ?? null,
    overall: overallScore({
      conversation: r.score_conversation as number | null,
      memory: r.score_memory as number | null,
      customization: r.score_customization as number | null,
      media: r.score_media as number | null,
      value: r.score_value as number | null,
      privacy: r.score_privacy as number | null,
    }),
    hasFreePlan: (r.has_free_plan as boolean | null) ?? null,
    startingPriceCents: (r.starting_price_cents as number | null) ?? null,
    currency: (r.currency as string | null) ?? null,
    reviewMethod: r.review_method as string,
  }));
  return { apps, categories: cats.map((c) => ({ slug: c.slug, name: c.name })) };
}

export type QuickAnswer = { q: string; a: string };

/**
 * Direct answers to the questions people ask about an app ("is X free", "how much is X", "is X private",
 * "does X have voice") — the sentences AI engines quote. Only facts we hold; unknown → the question is skipped.
 */
export function quickAnswers(app: AppDetail): QuickAnswer[] {
  const out: QuickAnswer[] = [];
  const price =
    app.startingPriceCents !== null && app.currency ? formatPrice(app.startingPriceCents, app.currency) : null;
  if (app.hasFreePlan !== null)
    out.push({
      q: `Is ${app.name} free?`,
      a: app.hasFreePlan
        ? `Yes, ${app.name} has a free plan${price ? `; paid plans start at ${price} a month` : ""}.`
        : `No, ${app.name} has no free plan${price ? `; the cheapest plan is ${price} a month` : ""}.`,
    });
  if (price && app.hasFreePlan === null)
    out.push({ q: `How much does ${app.name} cost?`, a: `Paid plans start at ${price} a month.` });
  if (app.scoreNotes.privacy)
    out.push({
      q: `Is ${app.name} private?`,
      a: `From its privacy policy: ${app.scoreNotes.privacy.replace(/\s*\(privacy policy\)\.?$/, ".")}`,
    });
  const media = [
    app.features.voice ? "voice" : null,
    app.features.imageGen ? "image generation" : null,
    app.features.memory ? "long-term memory" : null,
  ].filter(Boolean);
  if (media.length)
    out.push({
      q: `What features does ${app.name} have?`,
      a: `${app.name} advertises ${media.join(", ")}${app.features.customCharacter ? " and lets you create your own characters" : ""}.`,
    });
  if (app.companyName)
    out.push({
      q: `Who runs ${app.name}?`,
      a: `${app.companyName}${app.companyCountry ? ` (${app.companyCountry})` : ""}, according to its terms or store listing.`,
    });
  return out;
}
