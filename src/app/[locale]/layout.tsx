import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Analytics } from "@/components/public/analytics";
import { isLocale, locales, publishedLocales, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { isIndexable, siteUrl } from "@/lib/env";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getDictionary(locale);
  const published = publishedLocales.includes(locale);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t.meta.title, template: "%s · The Crush Guy" },
    description: t.meta.description,
    // Unpublished (untranslated/unreviewed) locales are never indexed.
    robots: published ? undefined : { index: false, follow: false },
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon.ico", sizes: "48x48" },
      ],
      apple: "/apple-touch-icon.png",
    },
    openGraph: { siteName: "The Crush Guy", images: ["/og-default.png"], locale },
  };
}

export const viewport: Viewport = { themeColor: "#1B1530" };

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return (
    <html lang={locale satisfies Locale}>
      <body className="flex min-h-dvh flex-col antialiased">
        <SiteHeader locale={locale} t={t} />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <SiteFooter locale={locale} t={t} />
        <Suspense fallback={null}>
          <AnalyticsGate locale={locale} t={t} />
        </Suspense>
      </body>
    </html>
  );
}

/** GA only on prod with a measurement ID (ADR-034); read at request time so one image serves dev and prod. */
async function AnalyticsGate({ locale, t }: { locale: Locale; t: Dictionary }) {
  await connection();
  const id = process.env.GA_MEASUREMENT_ID?.trim();
  if (!isIndexable() || !id || !/^G-[A-Z0-9]{4,20}$/.test(id)) return null;
  return <Analytics id={id} text={t.consent} privacyHref={`/${locale}/privacy`} />;
}
