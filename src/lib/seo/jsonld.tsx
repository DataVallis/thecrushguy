/**
 * schema.org JSON-LD (TASK-014). Our rating is our own editorial review — never fake user ratings
 * (07-LEGAL §2.5), so apps get a `Review` by our organization, not an AggregateRating.
 */
import type { AppDetail, CategoryPage } from "@/lib/public/catalog";
import { toTen } from "@/lib/public/scoring";

type Json = Record<string, unknown>;
const ORG = { "@type": "Organization", name: "The Crush Guy" };

export function JsonLd({ data }: { data: Json | Json[] }) {
  // Escape "<" so the JSON can never close the script tag (data comes from the database).
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function websiteLd(site: string, locale: string): Json[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "The Crush Guy",
      url: `${site}/${locale}`,
      inLanguage: locale,
    },
    { "@context": "https://schema.org", ...ORG, url: site, logo: `${site}/icon-512.png` },
  ];
}

export function breadcrumbLd(items: { name: string; url: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

export function categoryListLd(site: string, locale: string, cat: CategoryPage): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: cat.name,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: cat.apps.length,
    itemListElement: cat.apps.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${site}/${locale}/app/${a.slug}`,
      name: a.name,
    })),
  };
}

const OS: Record<string, string> = { ios: "iOS", android: "Android", desktop: "Windows, macOS", web: "Web" };

export function appLd(site: string, locale: string, app: AppDetail): Json {
  const cheapest = app.pricing[0];
  const offers = app.hasFreePlan
    ? { "@type": "Offer", price: "0", priceCurrency: cheapest?.currency ?? app.currency ?? "USD" }
    : cheapest
      ? { "@type": "Offer", price: (cheapest.priceCents / 100).toFixed(2), priceCurrency: cheapest.currency }
      : undefined;
  const os = [...new Set(app.platforms.map((p) => OS[p]).filter(Boolean))].join(", ");
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    url: `${site}/${locale}/app/${app.slug}`,
    applicationCategory: "LifestyleApplication",
    ...(os ? { operatingSystem: os } : {}),
    ...(offers ? { offers } : {}),
    // Review markup only for hands-on reviews: a rating computed from public facts is not a first-hand review
    // (Google review-snippet guidelines; ADR-030).
    ...(app.reviewMethod === "hands_on"
      ? {
          review: {
            "@type": "Review",
            author: ORG,
            reviewRating: { "@type": "Rating", ratingValue: toTen(app.overall), bestRating: "10", worstRating: "0" },
            ...(app.verifiedAt ? { datePublished: new Date(app.verifiedAt).toISOString().slice(0, 10) } : {}),
          },
        }
      : {}),
  };
}
