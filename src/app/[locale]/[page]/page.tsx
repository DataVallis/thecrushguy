import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { INFO, INFO_PAGES, type InfoPage } from "@/content/info-pages";
import { isLocale, locales, publishedLocales } from "@/i18n/config";

// Fully static: known page names prerendered at build (no database); anything else → notFound().
export function generateStaticParams() {
  return locales.flatMap((locale) => INFO_PAGES.map((page) => ({ locale, page })));
}

const isInfoPage = (p: string): p is InfoPage => (INFO_PAGES as readonly string[]).includes(p);

export async function generateMetadata({ params }: PageProps<"/[locale]/[page]">): Promise<Metadata> {
  const { locale, page } = await params;
  if (!isLocale(locale) || !isInfoPage(page)) return {};
  const c = INFO[page];
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: `/${locale}/${page}` },
    robots: c.indexable && publishedLocales.includes(locale) ? undefined : { index: false, follow: true },
  };
}

export default async function InfoRoute({ params }: PageProps<"/[locale]/[page]">) {
  const { locale, page } = await params;
  if (!isLocale(locale) || !isInfoPage(page)) notFound();
  const c = INFO[page];
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 leading-relaxed">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{c.title}</h1>
      {c.body}
    </article>
  );
}
