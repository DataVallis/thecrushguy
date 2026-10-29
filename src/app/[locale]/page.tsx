import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar, FactChips, Flags, ScoreBadge, VisitButton } from "@/components/public/app-bits";
import { Shortlist } from "@/components/public/shortlist";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { money } from "@/i18n/format";
import { siteUrl } from "@/lib/env";
import { getHomeData } from "@/lib/public/cached";
import type { AppCard, HomeData } from "@/lib/public/catalog";
import { toTen } from "@/lib/public/scoring";
import { JsonLd, faqLd, websiteLd } from "@/lib/seo/jsonld";
import { alternatesFor } from "@/lib/seo/meta";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { alternates: alternatesFor(locale, "") } : {};
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return (
    <>
      <JsonLd data={websiteLd(siteUrl(), locale)} />
      <Suspense fallback={<Hero t={t} locale={locale} data={null} />}>
        <HomeBody locale={locale} t={t} />
      </Suspense>
    </>
  );
}

async function HomeBody({ locale, t }: { locale: Locale; t: Dictionary }) {
  await connection(); // database read at request time, never during the (DB-less) Docker build
  const data = await getHomeData();
  if (data.all.length === 0)
    return (
      <>
        <Hero t={t} locale={locale} data={null} />
        <p className="mt-10 text-center text-muted">{t.home.empty}</p>
      </>
    );
  const faq = homeFaq(data, locale);
  const ld = faqLd(faq);
  return (
    <>
      {ld ? <JsonLd data={ld} /> : null}
      <Hero t={t} locale={locale} data={data} />
      <div className="mt-12 flex flex-col gap-16">
        <section id="shortlist" aria-labelledby="shortlist-title" className="scroll-mt-6">
          <h2 id="shortlist-title" className="mb-5 font-display text-3xl font-extrabold">
            {t.home.topApps}
          </h2>
          <Shortlist apps={data.all} locale={locale} t={t} placement="home-list" />
        </section>

        <Compare apps={data.all.slice(0, 5)} locale={locale} t={t} />

        {data.categories.length ? (
          <section aria-labelledby="cats">
            <h2 id="cats" className="mb-4 font-display text-2xl font-extrabold">
              {t.home.categories}
            </h2>
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

        <section aria-labelledby="faq">
          <h2 id="faq" className="mb-4 font-display text-2xl font-extrabold">
            {t.home.faqTitle}
          </h2>
          <dl className="grid gap-6 sm:grid-cols-3">
            {faq.map((f, i) => (
              <div key={f.q} className="rounded-3xl bg-white p-5">
                <Image
                  src={`/illustrations/${["search", "free", "voice"][i] ?? "search"}.svg`}
                  alt=""
                  width={72}
                  height={72}
                  unoptimized
                  className="mb-2"
                />
                <dt className="font-display text-lg leading-snug font-extrabold">{f.q}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}

/** Full-bleed midnight band: the promise on the left, our current top pick as a "profile" on the right. */
function Hero({ t, locale, data }: { t: Dictionary; locale: Locale; data: HomeData | null }) {
  const pick = data?.all[0];
  return (
    <section className="-mt-8 mx-[calc(50%-50vw)] bg-ink text-white">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:py-16 md:grid-cols-[1.15fr_1fr] md:items-center">
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-6xl">
            {t.home.tagline}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-white/80">{t.home.intro}</p>
          {data ? (
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              <li>
                <strong className="font-display text-xl text-white">{data.stats.apps}</strong> {t.home.statApps}
              </li>
              <li>
                <strong className="font-display text-xl text-white">{data.stats.sources}</strong> {t.home.statSources}
              </li>
              <li>
                <strong className="font-display text-xl text-white">0</strong> {t.home.statPaid}
              </li>
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#shortlist"
              className="rounded-full bg-white px-5 py-2.5 font-semibold text-ink hover:bg-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t.home.topApps}
            </a>
            <Link
              href={`/${locale}/how-we-rank`}
              className="text-sm font-medium text-white underline underline-offset-4"
            >
              {t.nav.howWeRank}
            </Link>
          </div>
          <p className="text-xs text-white/60">
            {t.disclosure.line}{" "}
            <Link href={`/${locale}/affiliate-disclosure`} className="underline">
              {t.disclosure.link}
            </Link>
          </p>
        </div>
        <div className="relative pt-32 md:pt-44">
          <Image
            src="/illustrations/hero.svg"
            alt=""
            width={240}
            height={210}
            priority
            unoptimized
            className="absolute top-0 right-2 z-10 w-40 md:right-6 md:w-56"
          />
          {pick ? <PickCard app={pick} locale={locale} t={t} /> : null}
        </div>
      </div>
    </section>
  );
}

function PickCard({ app, locale, t }: { app: AppCard; locale: Locale; t: Dictionary }) {
  return (
    <article className="relative rounded-[2rem] bg-white p-6 text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] ring-4 ring-coral/70">
      <p className="absolute -top-3 left-6 rounded-full bg-coral px-3 py-1 text-xs font-bold text-ink">
        {t.home.topPick}
      </p>
      <div className="flex items-center gap-4">
        <Avatar name={app.name} slug={app.slug} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl leading-tight font-extrabold">
            <Link href={`/${locale}/app/${app.slug}`} className="hover:underline">
              {app.name}
            </Link>
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{app.tagline}</p>
        </div>
        <ScoreBadge score={app.overall} t={t} />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <FactChips app={app} locale={locale} t={t} />
        <Flags app={app} t={t} />
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <VisitButton slug={app.slug} name={app.name} placement="home-pick" locale={locale} t={t} />
          <Link href={`/${locale}/app/${app.slug}`} className="text-sm font-medium underline underline-offset-2">
            {t.card.fullReview}
          </Link>
        </div>
      </div>
    </article>
  );
}

function Compare({ apps, locale, t }: { apps: AppCard[]; locale: Locale; t: Dictionary }) {
  if (apps.length < 2) return null;
  const yes = (v: boolean | null) =>
    v ? (
      <span className="font-semibold text-success">{t.card.yes}</span>
    ) : (
      <span className="text-muted">{t.card.no}</span>
    );
  return (
    <section aria-labelledby="compare">
      <h2 id="compare" className="mb-4 font-display text-2xl font-extrabold">
        {t.home.compareTitle}
      </h2>
      <div className="overflow-x-auto rounded-3xl border border-ink/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-lavender">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                App
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t.app.score}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t.filters.free}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t.app.startingPrice}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t.filters.voice}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t.filters.pictures}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t.filters.memory}
              </th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.slug} className="border-t border-ink/10">
                <th scope="row" className="px-4 py-3 font-display text-base font-extrabold">
                  <Link href={`/${locale}/app/${a.slug}`} className="hover:underline">
                    {a.name}
                  </Link>
                </th>
                <td className="px-4 py-3 font-display font-extrabold">{toTen(a.overall)}</td>
                <td className="px-4 py-3">{yes(a.hasFreePlan)}</td>
                <td className="px-4 py-3">
                  {a.startingPriceCents !== null && a.currency ? money(a.startingPriceCents, a.currency, locale) : "—"}
                </td>
                <td className="px-4 py-3">{yes(a.features.voice)}</td>
                <td className="px-4 py-3">{yes(a.features.imageGen)}</td>
                <td className="px-4 py-3">{yes(a.features.memory)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Answers computed from the listed apps (GEO, ADR-031) — counts and prices, nothing invented. */
function homeFaq(data: HomeData, locale: Locale): { q: string; a: string }[] {
  const n = data.all.length;
  const free = data.all.filter((a) => a.hasFreePlan).length;
  const priced = data.all
    .filter((a) => a.startingPriceCents !== null && a.currency === "USD")
    .sort((a, b) => a.startingPriceCents! - b.startingPriceCents!);
  const cheapest = priced[0];
  const voice = data.all.filter((a) => a.features.voice).length;
  const top = data.all[0]!;
  return [
    {
      q: "Which AI companion app is the best?",
      a: `By our score, ${top.name} (${toTen(top.overall)}/10) leads the ${n} apps we list. Scores weigh value, memory, customization, media and privacy${top.reviewMethod === "data" ? "; this one is rated from public information, not yet tested hands-on" : ""}.`,
    },
    {
      q: "Are AI girlfriend apps free?",
      a: `${free} of the ${n} apps we list have a free plan, usually with a daily message limit.${cheapest ? ` The cheapest paid plan we found is ${cheapest.name} at ${money(cheapest.startingPriceCents!, "USD", locale)} a month.` : ""}`,
    },
    {
      q: "Can AI companions talk with a voice?",
      a: `${voice} of the ${n} apps advertise voice messages or calls. Use the "${"Voice"}" filter above to see them.`,
    },
  ];
}
