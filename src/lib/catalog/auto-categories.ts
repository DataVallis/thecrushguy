/**
 * Fact-driven categories (TASK-023): each category here is fully managed by code — its membership is recomputed
 * from app facts (free plan, features, price, platforms, adult content). Ranking inside stays our score (ADR-005).
 * Categories created by hand in /admin are never touched. Names are full page titles (category.title = "{name}").
 */
import type postgres from "postgres";
import { audit, type Tx } from "@/lib/admin/repo";

type AppRow = {
  id: string;
  has_free_plan: boolean | null;
  starting_price_cents: number | null;
  currency: string | null;
  feat_voice: boolean;
  feat_image_gen: boolean;
  feat_long_term_memory: boolean;
  platforms: string[];
  nsfw_allowed: boolean;
};

export type AutoCategory = {
  slug: string;
  name: string;
  description: string;
  sort: number;
  isNsfw?: boolean;
  rule: (a: AppRow) => boolean;
};

const CHEAP = (a: AppRow) =>
  a.starting_price_cents !== null && ["USD", "EUR", "GBP"].includes(a.currency ?? "") && a.starting_price_cents <= 1000;

export const AUTO_CATEGORIES: AutoCategory[] = [
  {
    slug: "ai-companion-apps",
    name: "Best AI companion apps",
    description:
      "Every AI companion app we list — AI girlfriends, boyfriends, friends and character chats — ranked by our score. Prices, free plans and privacy facts are checked against each app's own pages.",
    sort: 10,
    rule: () => true,
  },
  {
    slug: "free-ai-companion-apps",
    name: "Best free AI companion apps",
    description:
      "AI companion apps with a free plan, ranked by our score. Free plans usually limit daily messages or features — the limits we found are on each app's page.",
    sort: 20,
    rule: (a) => a.has_free_plan === true,
  },
  {
    slug: "cheap-ai-companion-apps",
    name: "Cheap AI companion apps (under $10)",
    description:
      "AI companion apps whose regular monthly plan costs $10/€10 or less, ranked by our score. We use the regular monthly price, not first-month promos.",
    sort: 30,
    rule: CHEAP,
  },
  {
    slug: "ai-companions-with-voice",
    name: "Best AI companions with voice",
    description: "AI companion apps that advertise voice messages or voice calls, ranked by our score.",
    sort: 40,
    rule: (a) => a.feat_voice,
  },
  {
    slug: "ai-companions-with-pictures",
    name: "Best AI companions that send pictures",
    description: "AI companion apps that advertise in-chat image generation (SFW on this page), ranked by our score.",
    sort: 50,
    rule: (a) => a.feat_image_gen,
  },
  {
    slug: "ai-companions-with-memory",
    name: "AI companions with the best memory",
    description:
      "AI companion apps that advertise long-term memory — they remember names, facts and earlier chats. Ranked by our score; memory quality is not hands-on tested yet.",
    sort: 60,
    rule: (a) => a.feat_long_term_memory,
  },
  {
    slug: "ai-companion-apps-iphone",
    name: "Best AI companion apps for iPhone",
    description: "AI companion apps with an iOS app on the App Store, ranked by our score.",
    sort: 70,
    rule: (a) => a.platforms.includes("ios"),
  },
  {
    slug: "ai-companion-apps-android",
    name: "Best AI companion apps for Android",
    description: "AI companion apps with an Android app on Google Play, ranked by our score.",
    sort: 80,
    rule: (a) => a.platforms.includes("android"),
  },
  {
    slug: "nsfw-ai-chat",
    name: "Adults-only AI chat apps",
    description: "AI companion apps whose terms allow adult content. Adults (18+) only.",
    sort: 90,
    isNsfw: true,
    rule: (a) => a.nsfw_allowed,
  },
];

/** Creates missing auto categories and recomputes their memberships for all apps. Returns changes made. */
export async function syncAutoCategories(sql: postgres.Sql | Tx, actor: string): Promise<number> {
  let changes = 0;
  const apps = await sql<AppRow[]>`
    select id, has_free_plan, starting_price_cents, currency, feat_voice, feat_image_gen, feat_long_term_memory,
      platforms, nsfw_allowed from apps where status in ('draft', 'published', 'paused')`;
  for (const c of AUTO_CATEGORIES) {
    let [cat] = await sql<{ id: string; name: string; description: string | null; is_nsfw: boolean; sort: number }[]>`
      select id, name, description, is_nsfw, sort from categories where slug = ${c.slug}`;
    const row = { name: c.name, description: c.description, is_nsfw: !!c.isNsfw, sort: c.sort };
    if (!cat) {
      [cat] = await sql<{ id: string; name: string; description: string | null; is_nsfw: boolean; sort: number }[]>`
        insert into categories ${sql({ slug: c.slug, ...row })} returning id, name, description, is_nsfw, sort`;
      await audit(sql, actor, "create", "category", cat!.id, { slug: c.slug, ...row });
      changes++;
    } else if (
      cat.name !== row.name ||
      cat.description !== row.description ||
      cat.is_nsfw !== row.is_nsfw ||
      cat.sort !== row.sort
    ) {
      await sql`update categories set ${sql(row)} where id = ${cat.id}`;
      changes++;
    }
    const want = new Set(apps.filter(c.rule).map((a) => a.id));
    const have = new Set(
      (await sql<{ app_id: string }[]>`select app_id from app_categories where category_id = ${cat!.id}`).map(
        (r) => r.app_id,
      ),
    );
    const add = [...want].filter((id) => !have.has(id));
    const del = [...have].filter((id) => !want.has(id));
    for (const id of add) await sql`insert into app_categories (app_id, category_id) values (${id}, ${cat!.id})`;
    if (del.length) await sql`delete from app_categories where category_id = ${cat!.id} and app_id in ${sql(del)}`;
    if (add.length || del.length) {
      await audit(sql, actor, "auto-categories", "category", cat!.id, { added: add.length, removed: del.length });
      changes += add.length + del.length;
    }
  }
  return changes;
}
