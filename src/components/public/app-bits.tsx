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

export function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blush font-display text-xl font-extrabold text-coral-strong"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Outbound CTA → /go/{slug} (TASK-013). Always rel="sponsored nofollow" (Google guidance for affiliate links). */
export function VisitButton(props: { slug: string; name: string; placement: string; locale: string; t: Dictionary }) {
  return (
    <a
      href={`/go/${props.slug}?p=${props.placement}&l=${props.locale}`}
      rel="sponsored nofollow noopener"
      target="_blank"
      className="inline-flex items-center justify-center rounded-full bg-coral px-5 py-2.5 font-semibold text-white hover:bg-coral-strong"
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

export function AppRow(props: { app: AppCard; rank?: number; locale: string; t: Dictionary; placement: string }) {
  const { app, t, locale } = props;
  const price = priceLine(app, locale, t);
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        {props.rank ? (
          <span className="w-8 font-display text-xl font-extrabold text-muted">
            {fmt(t.category.rank, { n: props.rank })}
          </span>
        ) : null}
        <Avatar name={app.name} />
        <div>
          <Link href={`/${locale}/app/${app.slug}`} className="font-display text-lg font-extrabold hover:underline">
            {app.name}
          </Link>
          {app.tagline ? <p className="text-sm text-muted">{app.tagline}</p> : null}
          {price ? <p className="text-xs text-muted">{price}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:ml-auto">
        <ScoreBadge score={app.overall} t={t} />
        <Link href={`/${locale}/app/${app.slug}`} className="text-sm font-medium underline">
          {t.category.review}
        </Link>
        <VisitButton slug={app.slug} name={app.name} placement={props.placement} locale={locale} t={t} />
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
