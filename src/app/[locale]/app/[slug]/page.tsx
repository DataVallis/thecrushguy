import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppRow, Avatar, Paragraphs, ScoreBadge, VisitButton } from "@/components/public/app-bits";
import { Disclosure } from "@/components/public/site-chrome";
import { isLocale, publishedLocales, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { fmt, money, shortDate } from "@/i18n/format";
import { NsfwSection } from "@/lib/age-gate/gate";
import { siteUrl } from "@/lib/env";
import { getPublishedApp } from "@/lib/public/cached";
import { JsonLd, appLd, breadcrumbLd } from "@/lib/seo/jsonld";
import { DESCRIPTION_MAX, TITLE_MAX, alternatesFor, clamp } from "@/lib/seo/meta";
import { type AppDetail } from "@/lib/public/catalog";
import { WEIGHTS, isStale, toTen } from "@/lib/public/scoring";

export async function generateMetadata({ params }: PageProps<"/[locale]/app/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const app = await getPublishedApp(slug);
  if (!app) return { robots: { index: false } };
  return {
    title: clamp(`${app.name} review: score, pricing, pros & cons`, TITLE_MAX),
    description: clamp(
      `${app.name}: ${toTen(app.overall)}/10 in our hands-on test.${app.tagline ? ` ${app.tagline.replace(/[.!?]*$/, ".")}` : ""} Pricing with sources, pros and cons.`,
      DESCRIPTION_MAX,
    ),
    alternates: alternatesFor(locale, `/app/${slug}`),
    robots: publishedLocales.includes(locale) ? undefined : { index: false, follow: true },
  };
}

export default function AppRoute(props: PageProps<"/[locale]/app/[slug]">) {
  return (
    <Suspense fallback={null}>
      <AppPage {...props} />
    </Suspense>
  );
}

const yn = (v: boolean | null, t: Dictionary) => (v === null ? t.app.unknown : v ? t.app.yes : t.app.no);

async function AppPage({ params }: PageProps<"/[locale]/app/[slug]">) {
  await connection(); // request time: the "being re-checked" badge compares with the current date
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [t, app] = await Promise.all([getDictionary(locale), getPublishedApp(slug)]);
  if (!app) notFound();
  const sfwCategories = app.categories.filter((c) => !c.isNsfw);
  const features = (Object.keys(app.features) as (keyof AppDetail["features"])[]).filter((f) => app.features[f]);

  return (
    <article className="flex flex-col gap-10">
      <JsonLd
        data={[
          appLd(siteUrl(), locale, app),
          breadcrumbLd([
            { name: t.nav.home, url: `${siteUrl()}/${locale}` },
            ...(sfwCategories[0]
              ? [{ name: sfwCategories[0].name, url: `${siteUrl()}/${locale}/category/${sfwCategories[0].slug}` }]
              : []),
            { name: app.name, url: `${siteUrl()}/${locale}/app/${app.slug}` },
          ]),
        ]}
      />
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={app.name} />
          <div>
            <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{app.name}</h1>
            {app.tagline ? <p className="text-muted">{app.tagline}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ScoreBadge score={app.overall} t={t} size="lg" />
          {app.hasActiveLink ? (
            <VisitButton slug={app.slug} name={app.name} placement="app-header" locale={locale} t={t} />
          ) : null}
          <Verified app={app} locale={locale} t={t} />
        </div>
        <Disclosure locale={locale} t={t} />
      </header>

      <section aria-labelledby="facts">
        <h2 id="facts" className="mb-3 font-display text-2xl font-extrabold">
          {t.app.quickFacts}
        </h2>
        <dl className="grid gap-x-6 gap-y-2 rounded-2xl border border-ink/10 bg-white p-4 text-sm sm:grid-cols-2">
          <Fact label={t.app.freePlan} value={yn(app.hasFreePlan, t)} />
          <Fact
            label={t.app.startingPrice}
            value={
              app.startingPriceCents !== null && app.currency
                ? money(app.startingPriceCents, app.currency, locale)
                : t.app.unknown
            }
          />
          <Fact label={t.app.platforms} value={app.platforms.join(", ") || t.app.unknown} />
          <Fact label={t.app.features} value={features.map((f) => t.featureNames[f]).join(", ") || "—"} />
          <div className="sm:col-span-2">
            {/* Adult-content fact only past the age gate (01-PRODUCT-SPEC §3, ADR-025/026). */}
            <Suspense fallback={null}>
              <NsfwSection returnTo={`/${locale}/app/${app.slug}`}>
                <Fact label={t.app.nsfw} value={yn(app.nsfwAllowed, t)} />
              </NsfwSection>
            </Suspense>
          </div>
        </dl>
      </section>

      <section aria-labelledby="scores">
        <h2 id="scores" className="mb-3 font-display text-2xl font-extrabold">
          {t.app.scoreBreakdown}
        </h2>
        <ul className="flex flex-col gap-3">
          {(Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => {
            const s = app.scores[k] ?? 0;
            return (
              <li key={k} className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {t.criteria[k]} <span className="text-xs font-normal text-muted">({WEIGHTS[k]}%)</span>
                  </span>
                  <span className="font-display text-lg font-extrabold">{toTen(s)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-blush" aria-hidden>
                  <div className="h-2 rounded-full bg-coral" style={{ width: `${s}%` }} />
                </div>
                {app.scoreNotes[k] ? <p className="mt-2 text-sm text-muted">{app.scoreNotes[k]}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>

      {app.pricing.length ? (
        <section aria-labelledby="pricing">
          <h2 id="pricing" className="mb-3 font-display text-2xl font-extrabold">
            {t.app.pricing}
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white">
            <table className="w-full text-left text-sm">
              <tbody>
                {app.pricing.map((p, i) => (
                  <tr key={i} className="border-b border-ink/5 last:border-0">
                    <th scope="row" className="p-3 font-semibold">
                      {p.name}
                    </th>
                    <td className="p-3">
                      {money(p.priceCents, p.currency, locale)} {t.app.perPeriod[p.period]}
                      {p.notes ? <span className="block text-xs text-muted">{p.notes}</span> : null}
                    </td>
                    <td className="p-3 text-xs text-muted">
                      <a href={p.sourceUrl} rel="nofollow noopener" target="_blank" className="underline">
                        {t.app.source}
                      </a>{" "}
                      · {fmt(t.app.checked, { date: shortDate(p.checkedAt, locale) })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 sm:grid-cols-2">
        <List title={t.app.pros} items={app.pros} tone="pro" />
        <List title={t.app.cons} items={app.cons} tone="con" />
      </section>

      {app.bestFor.length ? (
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold">{t.app.bestFor}</h2>
          <ul className="flex flex-wrap gap-2">
            {app.bestFor.map((b) => (
              <li key={b} className="rounded-full bg-lavender px-3 py-1 text-sm">
                {b}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="verdict" className="flex flex-col gap-3">
        <h2 id="verdict" className="font-display text-2xl font-extrabold">
          {t.app.verdict}
        </h2>
        <Paragraphs text={app.verdictMd} />
        {app.hasActiveLink ? (
          <div>
            <VisitButton slug={app.slug} name={app.name} placement="app-verdict" locale={locale} t={t} />
          </div>
        ) : null}
      </section>

      {app.descriptionMd || app.companyName || app.privacyPolicyUrl ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-extrabold">{fmt(t.app.about, { name: app.name })}</h2>
          <Paragraphs text={app.descriptionMd} />
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {app.companyName ? (
              <Fact label={t.app.operator} value={[app.companyName, app.companyCountry].filter(Boolean).join(", ")} />
            ) : null}
            {app.privacyPolicyUrl ? (
              <div className="flex gap-2">
                <dt className="text-muted">{t.app.privacyPolicy}:</dt>
                <dd>
                  <a href={app.privacyPolicyUrl} rel="nofollow noopener" target="_blank" className="underline">
                    {new URL(app.privacyPolicyUrl).host}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {sfwCategories.length ? (
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold">{t.app.categories}</h2>
          <ul className="flex flex-wrap gap-2">
            {sfwCategories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/${locale}/category/${c.slug}`}
                  className="rounded-full bg-blush px-3 py-1 text-sm hover:underline"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {app.alternatives.length ? (
        <section>
          <h2 className="mb-3 font-display text-2xl font-extrabold">{fmt(t.app.alternatives, { name: app.name })}</h2>
          <ul className="flex flex-col gap-3">
            {app.alternatives.map((a) => (
              <AppRow key={a.slug} app={a} locale={locale} t={t} placement="app-alternatives" />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-sm">
        <a
          href={`mailto:hi@thecrushguy.com?subject=${encodeURIComponent(`Outdated info: ${app.name}`)}`}
          className="underline"
        >
          {t.app.report}
        </a>
      </p>
    </article>
  );
}

function Verified({ app, locale, t }: { app: AppDetail; locale: Locale; t: Dictionary }) {
  return (
    <span className="text-sm text-muted">
      {app.verifiedAt ? fmt(t.app.lastVerified, { date: shortDate(app.verifiedAt, locale) }) : t.app.notVerified}
      {app.verifiedAt && isStale(app.verifiedAt) ? (
        <span className="ml-2 rounded-full bg-blush px-2 py-0.5 text-xs text-coral-strong">{t.app.rechecking}</span>
      ) : null}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted">{label}:</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: "pro" | "con" }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <h2 className="mb-2 font-display text-xl font-extrabold">{title}</h2>
      <ul className="flex flex-col gap-1.5 text-sm">
        {items.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden className={tone === "pro" ? "text-success" : "text-coral-strong"}>
              {tone === "pro" ? "+" : "−"}
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
