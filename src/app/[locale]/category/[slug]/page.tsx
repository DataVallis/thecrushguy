import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppRow } from "@/components/public/app-bits";
import { Disclosure } from "@/components/public/site-chrome";
import { isLocale, publishedLocales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fmt } from "@/i18n/format";
import { NsfwSection } from "@/lib/age-gate/gate";
import { getCategoryPage } from "@/lib/public/cached";

export async function generateMetadata({ params }: PageProps<"/[locale]/category/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const [t, cat] = await Promise.all([getDictionary(locale), getCategoryPage(slug)]);
  if (!cat) return { robots: { index: false } };
  const title = fmt(t.category.title, { name: cat.name });
  return {
    title,
    description: cat.description ?? undefined,
    alternates: { canonical: `/${locale}/category/${slug}` },
    // Adults-only category pages are gated → never indexed (ADR-025/026). Thin (empty) lists aren't either.
    robots:
      cat.isNsfw || cat.apps.length === 0 || !publishedLocales.includes(locale)
        ? { index: false, follow: true }
        : undefined,
  };
}

export default function CategoryRoute(props: PageProps<"/[locale]/category/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Category {...props} />
    </Suspense>
  );
}

async function Category({ params }: PageProps<"/[locale]/category/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [t, cat] = await Promise.all([getDictionary(locale), getCategoryPage(slug)]);
  if (!cat) notFound();
  const list =
    cat.apps.length === 0 ? (
      <p className="text-muted">{t.category.empty}</p>
    ) : (
      <ol className="flex flex-col gap-3">
        {cat.apps.map((app, i) => (
          <AppRow key={app.slug} app={app} rank={i + 1} locale={locale} t={t} placement={`cat-${slug}`.slice(0, 32)} />
        ))}
      </ol>
    );
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          {fmt(t.category.title, { name: cat.name })}
        </h1>
        {cat.description ? <p className="max-w-2xl text-muted">{cat.description}</p> : null}
        <p className="text-sm text-muted">{t.category.ranked}</p>
        <Disclosure locale={locale} t={t} />
      </header>
      {cat.isNsfw ? (
        <Suspense fallback={null}>
          <NsfwSection returnTo={`/${locale}/category/${slug}`}>{list}</NsfwSection>
        </Suspense>
      ) : (
        list
      )}
    </div>
  );
}
