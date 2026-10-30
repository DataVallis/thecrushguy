import { listingFor } from "@/lib/admin/listing";
import { sql } from "@/lib/db/client";
import {
  addSourceAction,
  deletePricingAction,
  deleteSourceAction,
  saveAffiliateAction,
  savePricingAction,
} from "../../actions";
import { MiniForm } from "../../listing-forms";
import { fmtDate } from "../../ui";

const input = "rounded border border-neutral-300 bg-white px-2 py-1";
const money = (cents: number, cur: string) => `${(cents / 100).toFixed(2)} ${cur}`;

/** Sources, pricing plans and affiliate links of one app (TASK-011d). Caller has already run requireAdmin(). */
export async function Listing({ appId }: { appId: string }) {
  const { sources, plans, links } = await listingFor(sql(), appId);
  const sourceOptions = sources.map((s) => (
    <option key={s.id} value={s.id}>
      {s.field} — {new URL(s.url).host} ({fmtDate(s.checked_at).slice(0, 10)})
    </option>
  ));
  return (
    <div id="listing" className="mt-10 flex flex-col gap-10">
      <section>
        <h2 className="mb-1 text-lg font-semibold">Sources</h2>
        <p className="mb-3 text-xs text-neutral-600">
          Every factual claim (price, feature, operator) needs a source URL + date.
        </p>
        <ul className="mb-3 divide-y divide-neutral-200 rounded border border-neutral-200 bg-white text-sm">
          {sources.length === 0 ? <li className="p-2 text-neutral-500">No sources yet.</li> : null}
          {sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 p-2">
              <span className="font-medium">{s.field}</span>
              <a href={s.url} rel="noreferrer noopener" target="_blank" className="break-all underline">
                {s.url}
              </a>
              <span className="text-neutral-500">checked {fmtDate(s.checked_at).slice(0, 10)}</span>
              <span className="ml-auto">
                <MiniForm action={deleteSourceAction.bind(null, appId, s.id)} submit="Delete" danger>
                  {null}
                </MiniForm>
              </span>
            </li>
          ))}
        </ul>
        <MiniForm action={addSourceAction.bind(null, appId)} submit="Add source">
          <input name="url" placeholder="https://…" required className={`${input} w-72`} />
          <input name="field" placeholder="supports, e.g. pricing" required className={input} />
          <input name="checkedAt" type="date" className={input} />
          <input name="archivedUrl" placeholder="archive URL (optional)" className={input} />
        </MiniForm>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Pricing plans</h2>
        <ul className="mb-3 divide-y divide-neutral-200 rounded border border-neutral-200 bg-white text-sm">
          {plans.length === 0 ? <li className="p-2 text-neutral-500">No plans yet.</li> : null}
          {plans.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 p-2">
              <span className="font-medium">{p.name}</span>
              <span>
                {money(p.price_cents, p.currency)} / {p.period}
              </span>
              {p.notes ? <span className="text-neutral-500">{p.notes}</span> : null}
              <span className="ml-auto">
                <MiniForm action={deletePricingAction.bind(null, appId, p.id)} submit="Delete" danger>
                  {null}
                </MiniForm>
              </span>
            </li>
          ))}
        </ul>
        {sources.length === 0 ? (
          <p className="text-sm text-neutral-600">Add a source first — every price must cite one.</p>
        ) : (
          <MiniForm action={savePricingAction.bind(null, appId, null)} submit="Add plan">
            <input name="name" placeholder="Plan name" required className={input} />
            <input name="price" placeholder="9.99" required className={`${input} w-24`} />
            <input name="currency" placeholder="EUR" required className={`${input} w-20`} />
            <select name="period" className={input}>
              <option value="month">month</option>
              <option value="year">year</option>
              <option value="lifetime">lifetime</option>
              <option value="credits">credits</option>
            </select>
            <select name="sourceId" required className={input}>
              {sourceOptions}
            </select>
            <input name="notes" placeholder="notes (optional)" className={input} />
          </MiniForm>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Affiliate links</h2>
        <p className="mb-3 text-xs text-neutral-600">
          URLs are encrypted on save and never shown again — only the host. One active link per app. Countries: copy the
          offer&apos;s accepted countries from the network; visitors from other countries go to the official site
          instead of the network&apos;s fallback offers.
        </p>
        <ul className="mb-3 divide-y divide-neutral-200 rounded border border-neutral-200 bg-white text-sm">
          {links.length === 0 ? <li className="p-2 text-neutral-500">No links yet.</li> : null}
          {links.map((l) => (
            <li key={l.id} className="flex flex-col gap-2 p-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{l.url_hint}</span>
                <span>
                  {l.network} · {l.model}
                </span>
                <span className={l.active ? "text-emerald-700" : "text-neutral-500"}>
                  {l.active ? "active" : "inactive"}
                </span>
                {l.terms_summary ? <span className="text-neutral-500">{l.terms_summary}</span> : null}
                <span className="text-neutral-500">
                  {l.countries?.length
                    ? `only ${l.countries.join(", ")} — others go to the official site`
                    : "all countries"}
                </span>
              </div>
              <MiniForm action={saveAffiliateAction.bind(null, appId, l.id)} submit="Update">
                <input type="hidden" name="network" value={l.network} />
                <input type="hidden" name="model" value={l.model} />
                <input
                  name="termsSummary"
                  defaultValue={l.terms_summary ?? ""}
                  placeholder="terms summary"
                  className={input}
                />
                <input name="url" placeholder="new URL (blank = keep)" autoComplete="off" className={`${input} w-64`} />
                <input
                  name="countries"
                  defaultValue={l.countries?.join(", ") ?? ""}
                  placeholder="countries, e.g. US, GB, CA (blank = all)"
                  className={`${input} w-72`}
                />
                <select name="sourceId" defaultValue={l.source_id ?? ""} className={input}>
                  <option value="">no source</option>
                  {sourceOptions}
                </select>
                <label className="flex items-center gap-1">
                  <input type="checkbox" name="active" defaultChecked={l.active} /> active
                </label>
              </MiniForm>
            </li>
          ))}
        </ul>
        <MiniForm action={saveAffiliateAction.bind(null, appId, null)} submit="Add link">
          <select name="network" className={input}>
            <option value="direct">direct</option>
            <option value="crakrevenue">crakrevenue</option>
            <option value="other">other</option>
          </select>
          <select name="model" className={input}>
            <option value="revshare">revshare</option>
            <option value="cpa">cpa</option>
            <option value="pps">pps</option>
            <option value="hybrid">hybrid</option>
          </select>
          <input
            name="url"
            placeholder="https://… (affiliate URL)"
            required
            autoComplete="off"
            className={`${input} w-72`}
          />
          <input name="termsSummary" placeholder="terms summary" className={input} />
          <input name="countries" placeholder="countries, e.g. US, GB, CA (blank = all)" className={`${input} w-72`} />
          <select name="sourceId" className={input}>
            <option value="">no source</option>
            {sourceOptions}
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" name="active" defaultChecked /> active
          </label>
        </MiniForm>
      </section>
    </div>
  );
}
