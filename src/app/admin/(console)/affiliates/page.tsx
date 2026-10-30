import type { Metadata } from "next";
import { Suspense } from "react";
import {
  OUTREACH_STATUSES,
  STATUS_LABEL,
  forgottenApps,
  isDue,
  listOutreach,
  type OutreachRow,
} from "@/lib/admin/outreach";
import { requireAdmin } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import { deleteOutreachAction, saveOutreachAction, seedOutreachAction } from "../actions";
import { MiniForm } from "../listing-forms";
import { Loading, PageTitle } from "../ui";

export const metadata: Metadata = { title: "Affiliates" };

const day = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const input = "rounded border border-neutral-300 px-2 py-1";

export default function AffiliatesPage() {
  return (
    <>
      <PageTitle>Affiliate programs — who to apply to, who we&apos;re waiting on</PageTitle>
      <Suspense fallback={<Loading />}>
        <Affiliates />
      </Suspense>
    </>
  );
}

async function Affiliates() {
  await requireAdmin();
  const [rows, forgotten] = await Promise.all([listOutreach(sql()), forgottenApps(sql())]);
  const now = new Date();
  const due = rows.filter((r) => isDue(r, now));
  const groups: [string, OutreachRow[]][] = [
    ["Follow up now (no answer yet)", due],
    ["To apply", rows.filter((r) => r.status === "to_apply")],
    ["To contact (no public program — send an email)", rows.filter((r) => r.status === "to_contact")],
    ["Applied — waiting for an answer", rows.filter((r) => r.status === "applied" && !isDue(r, now))],
    ["Approved — add the link in the app's “Affiliate links”", rows.filter((r) => r.status === "approved")],
    ["Closed (rejected / no program)", rows.filter((r) => r.status === "rejected" || r.status === "no_program")],
  ];
  return (
    <div className="flex flex-col gap-8 text-sm">
      {rows.length === 0 ? (
        <section className="rounded border border-neutral-300 bg-white p-4">
          <p className="mb-2">No programs tracked yet. Load the researched list (25 programs and apps to contact):</p>
          <MiniForm action={seedOutreachAction} submit="Load researched programs">
            {null}
          </MiniForm>
        </section>
      ) : null}

      {forgotten.length ? (
        <section className="rounded border border-amber-300 bg-amber-50 p-3">
          <p className="font-semibold">Published apps with no link and nothing in progress:</p>
          <p>{forgotten.map((a) => a.name).join(", ")} — add them below (program = app name, status “To contact”).</p>
        </section>
      ) : null}

      {groups.map(([title, list]) =>
        list.length ? (
          <section key={title} className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">
              {title} ({list.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {list.map((r) => (
                <OutreachItem key={r.id} r={r} />
              ))}
            </ul>
          </section>
        ) : null,
      )}

      <section className="flex flex-col gap-2 rounded border border-neutral-300 bg-white p-3">
        <h2 className="text-lg font-bold">Add a program or app to track</h2>
        <MiniForm action={saveOutreachAction.bind(null, null)} submit="Add">
          <input name="program" placeholder="Program (e.g. CrakRevenue)" required className={input} />
          <input name="appSlug" placeholder="app slug (optional)" className={input} />
          <input name="signupUrl" placeholder="https://… signup page" className={input} />
          <select name="status" defaultValue="to_apply" className={input}>
            {OUTREACH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </MiniForm>
      </section>
    </div>
  );
}

function OutreachItem({ r }: { r: OutreachRow }) {
  const save = saveOutreachAction.bind(null, r.program);
  const remove = deleteOutreachAction.bind(null, r.program);
  return (
    <li className="rounded border border-neutral-300 bg-white p-3">
      <div className="flex flex-wrap items-center gap-3">
        <strong>{r.program}</strong>
        {r.app_name ? (
          <a href={`/admin/apps/${r.app_id}`} className="underline">
            {r.app_name}
            {r.app_status !== "published" ? ` (${r.app_status})` : ""}
          </a>
        ) : (
          <span className="text-neutral-500">network / several apps</span>
        )}
        {r.has_active_link ? (
          <span className="rounded bg-emerald-100 px-1.5 text-xs">link active</span>
        ) : r.status === "approved" ? (
          <span className="rounded bg-amber-100 px-1.5 text-xs">approved — link not added yet</span>
        ) : null}
        {r.signup_url ? (
          <a href={r.signup_url} target="_blank" rel="noopener noreferrer" className="underline">
            Signup page ↗
          </a>
        ) : null}
        {r.applied_at ? <span className="text-neutral-600">applied {day(r.applied_at)}</span> : null}
        {r.follow_up_at && r.status === "applied" ? (
          <span className="text-neutral-600">follow up {day(r.follow_up_at)}</span>
        ) : null}
      </div>
      {r.terms ? <p className="mt-1 text-xs text-neutral-600">Terms (research): {r.terms}</p> : null}
      {r.notes ? <p className="mt-1 text-xs text-neutral-600">Notes: {r.notes}</p> : null}
      <div className="mt-2 flex flex-wrap items-end gap-3">
        {r.status === "to_apply" || r.status === "to_contact" ? (
          <MiniForm action={save} submit="Applied / sent today ✓">
            <input type="hidden" name="status" value="applied" />
          </MiniForm>
        ) : null}
        {r.status === "applied" ? (
          <>
            <MiniForm action={save} submit="Approved ✓">
              <input type="hidden" name="status" value="approved" />
            </MiniForm>
            <MiniForm action={save} submit="Rejected" danger>
              <input type="hidden" name="status" value="rejected" />
            </MiniForm>
          </>
        ) : null}
        <details>
          <summary className="cursor-pointer text-neutral-600 underline">Edit</summary>
          <MiniForm action={save} submit="Save" className="mt-2 flex flex-wrap items-end gap-2">
            <select name="status" defaultValue={r.status} className={input}>
              {OUTREACH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <label className="flex flex-col text-xs">
              Applied
              <input type="date" name="appliedAt" defaultValue={day(r.applied_at)} className={input} />
            </label>
            <label className="flex flex-col text-xs">
              Follow up
              <input type="date" name="followUpAt" defaultValue={day(r.follow_up_at)} className={input} />
            </label>
            <input
              name="contact"
              defaultValue={r.contact ?? ""}
              placeholder="contact (email / Telegram of the manager)"
              className={input}
            />
            <input name="signupUrl" defaultValue={r.signup_url ?? ""} placeholder="signup URL" className={input} />
            <input name="notes" defaultValue={r.notes ?? ""} placeholder="notes" className={`${input} w-full`} />
          </MiniForm>
          <MiniForm action={remove} submit="Delete this row (duplicate / mistake)" danger className="mt-3">
            {null}
          </MiniForm>
        </details>
      </div>
    </li>
  );
}
