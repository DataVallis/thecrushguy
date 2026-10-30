"use client";

import { useActionState } from "react";
import type { FormState, ImportState, ResearchState } from "./actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

/**
 * Small admin forms whose inputs are rendered by the server (children). Shows field errors as a list;
 * the browser keeps the typed values only until the next successful save (good enough for short forms).
 */
export function MiniForm(props: {
  action: Action;
  children: React.ReactNode;
  submit: string;
  className?: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(props.action, { seq: 0 });
  const errors = Object.entries(state.errors ?? {});
  return (
    <form action={formAction} className={props.className ?? "flex flex-wrap items-end gap-2 text-sm"}>
      {props.children}
      <button
        type="submit"
        disabled={pending}
        className={props.danger ? "text-red-700 underline" : "rounded border border-neutral-400 bg-white px-3 py-1.5"}
      >
        {props.submit}
      </button>
      {errors.length ? (
        <ul role="alert" className="w-full text-xs text-red-700">
          {errors.map(([k, m]) => (
            <li key={k}>
              {k === "_form" ? "" : `${k}: `}
              {m}
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}

export function ImportForm(props: { action: (prev: ImportState, form: FormData) => Promise<ImportState> }) {
  const [state, formAction, pending] = useActionState(props.action, { seq: 0 });
  const r = state.report;
  return (
    <form action={formAction} className="flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="font-medium">CSV file</span>
        <input type="file" name="file" accept=".csv,text/csv" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">…or paste CSV</span>
        <textarea name="csv" rows={8} className="rounded border border-neutral-300 bg-white p-2 font-mono text-xs" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-coral px-4 py-2 text-ink font-semibold hover:bg-coral/85"
      >
        {pending ? "Importing…" : "Import"}
      </button>
      {r ? (
        r.errors.length ? (
          <div role="alert" className="rounded bg-red-50 p-3">
            <p className="font-medium">Nothing was imported:</p>
            <ul className="list-disc pl-5">
              {r.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p role="status" className="rounded bg-emerald-50 p-3">
            Created {r.created}, updated {r.updated}, unchanged {r.unchanged}, sources added {r.sourcesAdded}, skipped
            (excluded/hold) {r.skipped}.
          </p>
        )
      ) : null}
    </form>
  );
}

export function ResearchImportForm(props: { action: (prev: ResearchState) => Promise<ResearchState> }) {
  const [state, formAction, pending] = useActionState(props.action, { seq: 0 });
  const { seed, facts } = state;
  return (
    <form action={formAction} className="flex flex-col gap-3 text-sm">
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-coral px-4 py-2 text-ink font-semibold hover:bg-coral/85"
      >
        {pending ? "Importing…" : "Import research bundle"}
      </button>
      {seed?.errors.length || facts?.errors.length ? (
        <div role="alert" className="rounded bg-red-50 p-3">
          <p className="font-medium">Nothing was imported:</p>
          <ul className="list-disc pl-5">
            {[...(seed?.errors ?? []), ...(facts?.errors ?? [])].map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : seed && facts ? (
        <div role="status" className="rounded bg-emerald-50 p-3">
          <p>
            Apps: created {seed.created}, updated {seed.updated}, unchanged {seed.unchanged}, skipped (excluded/hold){" "}
            {seed.skipped}.
          </p>
          <p>
            Data reviews: updated {facts.updated}, unchanged {facts.unchanged}
            {facts.skippedHandsOn.length ? `, kept hands-on: ${facts.skippedHandsOn.join(", ")}` : ""}.
          </p>
          {facts.held.length ? (
            <details>
              <summary>On hold ({facts.held.length}) — not imported</summary>
              <ul className="list-disc pl-5">
                {facts.held.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
