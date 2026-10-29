import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppRow } from "@/components/public/app-bits";
import { Disclosure } from "@/components/public/site-chrome";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { getHomeData } from "@/lib/public/cached";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3 py-6 text-center">
        <h1 className="font-display text-3xl font-extrabold text-ink sm:text-5xl">{t.home.tagline}</h1>
        <p className="mx-auto max-w-2xl text-muted">{t.home.intro}</p>
        <div className="mx-auto">
          <Disclosure locale={locale} t={t} />
        </div>
      </section>
      <Suspense fallback={null}>
        <HomeLists locale={locale} t={t} />
      </Suspense>
    </div>
  );
}

async function HomeLists({ locale, t }: { locale: Locale; t: Dictionary }) {
  await connection(); // database read at request time, never during the (DB-less) Docker build
  const data = await getHomeData();
  if (data.top.length === 0) return <p className="text-center text-muted">{t.home.empty}</p>;
  return (
    <>
      <section>
        <h2 className="mb-4 font-display text-2xl font-extrabold">{t.home.topApps}</h2>
        <ol className="flex flex-col gap-3">
          {data.top.map((app, i) => (
            <AppRow key={app.slug} app={app} rank={i + 1} locale={locale} t={t} placement="home-top" />
          ))}
        </ol>
      </section>
      {data.categories.length ? (
        <section>
          <h2 className="mb-4 font-display text-2xl font-extrabold">{t.home.categories}</h2>
          <ul className="flex flex-wrap gap-2">
            {data.categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/${locale}/category/${c.slug}`}
                  className="inline-block rounded-full bg-blush px-4 py-2 text-sm font-medium hover:underline"
                >
                  {c.name} <span className="text-muted">({c.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2 className="mb-4 font-display text-2xl font-extrabold">{t.home.newApps}</h2>
        <ul className="flex flex-col gap-3">
          {data.recent.map((app) => (
            <AppRow key={app.slug} app={app} locale={locale} t={t} placement="home-new" />
          ))}
        </ul>
      </section>
    </>
  );
}
