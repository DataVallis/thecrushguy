/**
 * Read model for public pages (TASK-012a). Only `published` apps are ever returned. Plain functions taking the
 * DB client (tested directly); the cached wrappers with tags live in `cached.ts`.
 */
import type postgres from "postgres";
import { overallScore, type Scores } from "./scoring";

export type CategoryRef = { slug: string; name: string; isNsfw: boolean };

export type AppCard = {
  slug: string;
  name: string;
  tagline: string | null;
  overall: number;
  hasFreePlan: boolean | null;
  startingPriceCents: number | null;
  currency: string | null;
  rankOverride?: number | null;
};

export type PricingRow = {
  name: string;
  priceCents: number;
  currency: string;
  period: "month" | "year" | "lifetime" | "credits";
  notes: string | null;
  sourceUrl: string;
  checkedAt: Date;
};

export type AppDetail = AppCard & {
  id: string;
  descriptionMd: string | null;
  websiteHost: string;
  platforms: string[];
  features: Record<"voice" | "imageGen" | "video" | "memory" | "groupChat" | "customCharacter" | "api", boolean>;
  nsfwAllowed: boolean;
  companyName: string | null;
  companyCountry: string | null;
  privacyPolicyUrl: string | null;
  scores: Scores;
  scoreNotes: Record<keyof Scores, string | null>;
  pros: string[];
  cons: string[];
  bestFor: string[];
  verdictMd: string | null;
  verifiedAt: Date | null;
  hasActiveLink: boolean;
  categories: CategoryRef[];
  pricing: PricingRow[];
  alternatives: AppCard[];
};

type Row = Record<string, unknown>;

const scoresOf = (r: Row): Scores => ({
  conversation: r.score_conversation as number | null,
  memory: r.score_memory as number | null,
  customization: r.score_customization as number | null,
  media: r.score_media as number | null,
  value: r.score_value as number | null,
  privacy: r.score_privacy as number | null,
});

const cardOf = (r: Row): AppCard => ({
  slug: r.slug as string,
  name: r.name as string,
  tagline: (r.tagline as string | null) ?? null,
  overall: overallScore(scoresOf(r)),
  hasFreePlan: (r.has_free_plan as boolean | null) ?? null,
  startingPriceCents: (r.starting_price_cents as number | null) ?? null,
  currency: (r.currency as string | null) ?? null,
});

/** Ranked: our score, high → low; ties by name. Never by affiliate terms (ADR-005). */
export function byScore(a: AppCard, b: AppCard): number {
  return b.overall - a.overall || a.name.localeCompare(b.name);
}

export async function loadPublishedApp(db: postgres.Sql, slug: string): Promise<AppDetail | null> {
  const [r] = await db<Row[]>`
    select a.*, exists(select 1 from affiliate_links l where l.app_id = a.id and l.active) as has_active_link
    from apps a where a.slug = ${slug} and a.status = 'published'`;
  if (!r) return null;
  const id = r.id as string;
  const [cats, plans, alts] = await Promise.all([
    db<{ slug: string; name: string; is_nsfw: boolean; id: string }[]>`
      select c.id, c.slug, c.name, c.is_nsfw from app_categories ac join categories c on c.id = ac.category_id
      where ac.app_id = ${id} order by c.sort, c.name`,
    db<Row[]>`
      select p.name, p.price_cents, p.currency, p.period, p.notes, s.url as source_url, s.checked_at
      from pricing_plans p join sources s on s.id = p.source_id
      where p.app_id = ${id} order by p.price_cents, p.name`,
    db<Row[]>`
      select distinct a.* from apps a join app_categories ac on ac.app_id = a.id
      join categories c on c.id = ac.category_id
      where a.status = 'published' and a.id <> ${id} and not c.is_nsfw
        and ac.category_id in (select category_id from app_categories where app_id = ${id})`,
  ]);
  const scoreNote = (k: string) => (r[`score_${k}_note`] as string | null) ?? null;
  return {
    ...cardOf(r),
    id,
    descriptionMd: (r.description_md as string | null) ?? null,
    websiteHost: new URL(r.website_url as string).host,
    platforms: r.platforms as string[],
    features: {
      voice: r.feat_voice as boolean,
      imageGen: r.feat_image_gen as boolean,
      video: r.feat_video as boolean,
      memory: r.feat_long_term_memory as boolean,
      groupChat: r.feat_group_chat as boolean,
      customCharacter: r.feat_custom_character as boolean,
      api: r.feat_api as boolean,
    },
    nsfwAllowed: r.nsfw_allowed as boolean,
    companyName: (r.company_name as string | null) ?? null,
    companyCountry: (r.company_country as string | null) ?? null,
    privacyPolicyUrl: (r.privacy_policy_url as string | null) ?? null,
    scores: scoresOf(r),
    scoreNotes: {
      conversation: scoreNote("conversation"),
      memory: scoreNote("memory"),
      customization: scoreNote("customization"),
      media: scoreNote("media"),
      value: scoreNote("value"),
      privacy: scoreNote("privacy"),
    },
    pros: r.pros as string[],
    cons: r.cons as string[],
    bestFor: r.best_for as string[],
    verdictMd: (r.verdict_md as string | null) ?? null,
    verifiedAt: (r.verified_at as Date | null) ?? null,
    hasActiveLink: r.has_active_link as boolean,
    categories: cats.map((c) => ({ slug: c.slug, name: c.name, isNsfw: c.is_nsfw })),
    pricing: plans.map((p) => ({
      name: p.name as string,
      priceCents: p.price_cents as number,
      currency: p.currency as string,
      period: p.period as PricingRow["period"],
      notes: (p.notes as string | null) ?? null,
      sourceUrl: p.source_url as string,
      checkedAt: p.checked_at as Date,
    })),
    alternatives: alts.map(cardOf).sort(byScore).slice(0, 4),
  };
}

export type CategoryPage = {
  slug: string;
  name: string;
  description: string | null;
  isNsfw: boolean;
  apps: AppCard[];
};

/** Ranked list: admin rank override first (1, 2, …), then our score. */
export async function loadCategoryPage(db: postgres.Sql, slug: string): Promise<CategoryPage | null> {
  const [c] = await db<Row[]>`select id, slug, name, description, is_nsfw from categories where slug = ${slug}`;
  if (!c) return null;
  const rows = await db<Row[]>`
    select a.*, ac.rank_override from apps a join app_categories ac on ac.app_id = a.id
    where ac.category_id = ${c.id as string} and a.status = 'published'`;
  const apps = rows.map((r) => ({ ...cardOf(r), rankOverride: (r.rank_override as number | null) ?? null }));
  apps.sort((a, b) => {
    const ra = a.rankOverride ?? Number.MAX_SAFE_INTEGER;
    const rb = b.rankOverride ?? Number.MAX_SAFE_INTEGER;
    return ra - rb || byScore(a, b);
  });
  return {
    slug: c.slug as string,
    name: c.name as string,
    description: (c.description as string | null) ?? null,
    isNsfw: c.is_nsfw as boolean,
    apps,
  };
}

export type HomeData = { top: AppCard[]; categories: (CategoryRef & { count: number })[]; recent: AppCard[] };

export async function loadHomeData(db: postgres.Sql): Promise<HomeData> {
  const [apps, cats] = await Promise.all([
    db<Row[]>`select * from apps where status = 'published'`,
    db<{ slug: string; name: string; is_nsfw: boolean; count: number }[]>`
      select c.slug, c.name, c.is_nsfw, count(a.id)::int as count from categories c
      join app_categories ac on ac.category_id = c.id
      join apps a on a.id = ac.app_id and a.status = 'published'
      where not c.is_nsfw group by c.id order by c.sort, c.name`,
  ]);
  const cards = apps.map((r) => ({ card: cardOf(r), created: r.created_at as Date }));
  return {
    top: cards
      .map((c) => c.card)
      .sort(byScore)
      .slice(0, 10),
    categories: cats.map((c) => ({ slug: c.slug, name: c.name, isNsfw: c.is_nsfw, count: c.count })),
    recent: cards
      .sort((a, b) => b.created.getTime() - a.created.getTime())
      .slice(0, 5)
      .map((c) => c.card),
  };
}
