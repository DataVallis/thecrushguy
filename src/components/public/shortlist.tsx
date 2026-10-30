"use client";

import Image from "next/image";
import { useState } from "react";
import { fmt } from "@/i18n/format";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AppCard } from "@/lib/public/catalog";
import { AppRow } from "./app-bits";

type FilterKey = "free" | "voice" | "pictures" | "memory" | "cheap";

/** USD/EUR/GBP entry price under 10 a month (other currencies are left out of this filter). */
const CHEAP = (a: AppCard) =>
  a.startingPriceCents !== null && ["USD", "EUR", "GBP"].includes(a.currency ?? "") && a.startingPriceCents < 1000;

const TEST: Record<FilterKey, (a: AppCard) => boolean> = {
  free: (a) => a.hasFreePlan === true,
  voice: (a) => a.features.voice,
  pictures: (a) => a.features.imageGen,
  memory: (a) => a.features.memory,
  cheap: CHEAP,
};

/** Ranked list with "what matters to you" toggles. Ranking order never changes — filters only hide apps. */
export function Shortlist(props: { apps: AppCard[]; locale: string; t: Dictionary; placement: string }) {
  const { t } = props;
  const [on, setOn] = useState<FilterKey[]>([]);
  const shown = props.apps.filter((a) => on.every((k) => TEST[k](a)));
  const toggle = (k: FilterKey) => setOn((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 font-display text-lg font-extrabold">{t.home.filterTitle}</legend>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
          {(Object.keys(TEST) as FilterKey[]).map((k) => {
            const active = on.includes(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(k)}
                className={`flex w-32 shrink-0 snap-start flex-col items-center gap-1 rounded-3xl border-2 bg-white p-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta sm:w-auto ${
                  active ? "border-ink shadow-[0_6px_0_0_#1B1530]" : "border-ink/10 hover:border-ink/40"
                }`}
              >
                <Image src={`/illustrations/${k}.svg`} alt="" width={88} height={88} unoptimized />
                <span className="flex items-center gap-1">
                  {active ? <span aria-hidden>✓</span> : null}
                  {t.filters[k]}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <p className="text-sm text-muted" aria-live="polite">
        {fmt(t.home.showing, { n: shown.length, total: props.apps.length })}
        {on.length ? (
          <>
            {" "}
            <button type="button" onClick={() => setOn([])} className="font-medium text-ink underline">
              {t.home.clear}
            </button>
          </>
        ) : null}
      </p>
      {shown.length ? (
        <ol className="flex flex-col gap-3">
          {shown.map((app) => (
            <AppRow
              key={app.slug}
              app={app}
              rank={props.apps.indexOf(app) + 1}
              locale={props.locale}
              t={t}
              placement={props.placement}
            />
          ))}
        </ol>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center text-muted">
          <Image src="/illustrations/search.svg" alt="" width={160} height={128} unoptimized />
          <p>{t.home.noMatch}</p>
          <button type="button" onClick={() => setOn([])} className="font-semibold text-ink underline">
            {t.home.clear}
          </button>
        </div>
      )}
    </div>
  );
}
