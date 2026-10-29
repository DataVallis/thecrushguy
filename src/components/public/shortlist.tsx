"use client";

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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-display text-lg font-extrabold">{t.home.filterTitle}</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TEST) as FilterKey[]).map((k) => {
            const active = on.includes(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(k)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta ${
                  active ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink hover:border-ink/40"
                }`}
              >
                {active ? "✓ " : ""}
                {t.filters[k]}
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
        <p className="rounded-3xl bg-white p-6 text-center text-muted">{t.home.noMatch}</p>
      )}
    </div>
  );
}
