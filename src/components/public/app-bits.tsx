import Link from "next/link";
import { fmt, money } from "@/i18n/format";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AppCard } from "@/lib/public/catalog";
import { toTen } from "@/lib/public/scoring";

export function ScoreBadge({ score, t, size = "md" }: { score: number; t: Dictionary; size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <span
      className={`inline-flex items-baseline gap-0.5 rounded-xl bg-ink font-display font-extrabold text-white ${big ? "px-4 py-2 text-3xl" : "px-2.5 py-1 text-lg"}`}
      aria-label={`${t.app.score}: ${toTen(score)} ${t.app.outOf}`}
    >
      {toTen(score)}
      <span className={`font-sans font-medium text-white/70 ${big ? "text-base" : "text-xs"}`}>{t.app.outOf}</span>
    </span>
  );
}

/** Profile-photo stand-in: the app's initial on blush with a small coral heart (we never use vendor imagery). */
export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <span
      aria-hidden
      className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-blush font-display font-extrabold text-coral-strong ${big ? "size-20 text-4xl" : "size-12 text-xl"}`}
    >
      {name.slice(0, 1).toUpperCase()}
      <svg
        viewBox="0 0 24 24"
        className={`absolute -right-1 -bottom-1 fill-coral ${big ? "size-6" : "size-4"}`}
        aria-hidden
      >
        <path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.3 4.5 6 4.5c2.2 0 3.6 1.3 4.5 2.6l1.5 2 1.5-2c.9-1.3 2.3-2.6 4.5-2.6 3.7 0 5.6 3.9 4 7.2C19.5 16.4 12 21 12 21z" />
      </svg>
    </span>
  );
}

/** Outbound CTA → /go/{slug} (TASK-013): affiliate link if we have one, else the app's official site (TASK-018). */
export function VisitButton(props: {
  slug: string;
  name: string;
  placement: string;
  locale: string;
  t: Dictionary;
  wide?: boolean;
}) {
  return (
    <a
      href={`/go/${props.slug}?p=${props.placement}&l=${props.locale}`}
      rel="sponsored nofollow noopener"
      target="_blank"
      className={`inline-flex items-center justify-center rounded-full bg-cta px-5 py-2.5 text-center font-semibold whitespace-nowrap text-white hover:bg-cta-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta ${props.wide ? "w-full" : ""}`}
    >
      {fmt(props.t.app.visit, { name: props.name })}
    </a>
  );
}

export function priceLine(app: AppCard, locale: string, t: Dictionary): string | null {
  if (app.hasFreePlan) return t.category.free;
  if (app.startingPriceCents !== null && app.currency)
    return fmt(t.category.from, { price: money(app.startingPriceCents, app.currency, locale) });
  return null;
}

/** Small factual tags: free plan, entry price and the headline features. */
export function FactChips({ app, locale, t }: { app: AppCard; locale: string; t: Dictionary }) {
  const chips = [
    app.hasFreePlan ? t.filters.free : null,
    app.startingPriceCents !== null && app.currency
      ? `${t.card.from} ${money(app.startingPriceCents, app.currency, locale)}`
      : null,
    app.features.voice ? t.filters.voice : null,
    app.features.imageGen ? t.filters.pictures : null,
    app.features.memory ? t.filters.memory : null,
  ].filter((c): c is string => !!c);
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Key facts">
      {chips.map((c) => (
        <li key={c} className="rounded-full bg-lavender px-2.5 py-0.5 text-xs font-medium text-ink">
          {c}
        </li>
      ))}
    </ul>
  );
}

/** The strongest pro and con, in dating vocabulary. Facts from the review, never invented. */
export function Flags({ app, t }: { app: AppCard; t: Dictionary }) {
  if (!app.greenFlag && !app.redFlag) return null;
  return (
    <dl className="grid gap-1 text-sm sm:grid-cols-2">
      {app.greenFlag ? (
        <div className="flex gap-2">
          <dt className="shrink-0 font-semibold text-success">
            <span aria-hidden>●</span> {t.card.greenFlag}
          </dt>
          <dd>{app.greenFlag}</dd>
        </div>
      ) : null}
      {app.redFlag ? (
        <div className="flex gap-2">
          <dt className="shrink-0 font-semibold text-danger">
            <span aria-hidden>●</span> {t.card.redFlag}
          </dt>
          <dd>{app.redFlag}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function AppRow(props: { app: AppCard; rank?: number; locale: string; t: Dictionary; placement: string }) {
  const { app, t, locale } = props;
  return (
    <li className="group relative grid gap-4 rounded-3xl border border-ink/10 bg-white p-4 transition-shadow hover:shadow-[0_8px_30px_-12px_rgba(27,21,48,0.25)] sm:grid-cols-[1fr_auto] sm:p-5">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start gap-3">
          {props.rank ? (
            <span className="w-7 shrink-0 pt-3 font-display text-xl font-extrabold text-muted tabular-nums">
              {props.rank}
            </span>
          ) : null}
          <Avatar name={app.name} />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl leading-tight font-extrabold">
              {/* The name link covers the card (stretched link) so the whole card opens the review. */}
              <Link
                href={`/${locale}/app/${app.slug}`}
                className="after:absolute after:inset-0 after:rounded-3xl after:content-[''] hover:underline"
              >
                {app.name}
              </Link>
            </h3>
            {app.tagline ? <p className="mt-0.5 line-clamp-2 text-sm text-muted">{app.tagline}</p> : null}
          </div>
          <div className="sm:hidden">
            <ScoreBadge score={app.overall} t={t} />
          </div>
        </div>
        <FactChips app={app} locale={locale} t={t} />
        <Flags app={app} t={t} />
      </div>
      <div className="relative z-10 flex items-center gap-3 sm:flex-col sm:items-end sm:justify-center">
        <div className="hidden sm:block">
          <ScoreBadge score={app.overall} t={t} />
        </div>
        <VisitButton slug={app.slug} name={app.name} placement={props.placement} locale={locale} t={t} />
        <Link
          href={`/${locale}/app/${app.slug}`}
          className="text-sm font-medium text-ink underline underline-offset-2 sm:no-underline sm:hover:underline"
        >
          {t.card.fullReview}
        </Link>
      </div>
    </li>
  );
}

/** Plain-text paragraphs from the Markdown fields (no HTML is ever rendered from the database). */
export function Paragraphs({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="leading-relaxed">
            {p}
          </p>
        ))}
    </>
  );
}
