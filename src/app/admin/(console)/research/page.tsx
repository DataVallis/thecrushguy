import type { Metadata } from "next";
import { Suspense } from "react";
import bundle from "@/data/research-bundle.json";
import { reviewQueue } from "@/lib/admin/repo";
import { requireAdmin } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import { toTen } from "@/lib/public/scoring";
import { galleryOkPublishAction, importResearchAction, rejectFromQueueAction } from "../actions";
import { MiniForm, ResearchImportForm } from "../listing-forms";
import { Loading, PageTitle } from "../ui";

export const metadata: Metadata = { title: "Research & review queue" };

export default function ResearchPage() {
  return (
    <>
      <PageTitle>Research &amp; review queue</PageTitle>
      <Suspense fallback={<Loading />}>
        <Research />
      </Suspense>
    </>
  );
}

async function Research() {
  await requireAdmin();
  const queue = await reviewQueue(sql());
  const ready = queue.filter((q) => q.blockers.length === 0);
  const waiting = queue.filter((q) => q.blockers.length > 0);
  return (
    <div className="flex flex-col gap-8 text-sm">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">1. Import</h2>
        <p>
          Research bundle from {bundle.generated_at}: {bundle.facts.length} apps with sourced facts. Creates missing
          apps as drafts and (re)computes their data-based reviews (ADR-030). Never publishes, never touches hands-on
          reviews. Safe to run again.
        </p>
        <ResearchImportForm action={importResearchAction} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">2. Gallery check → publish ({ready.length} ready)</h2>
        <p>
          For each app: open the site, look at the public character gallery and marketing (2 minutes). If nothing looks
          like a minor (school uniforms, child-like bodies or faces, &quot;teen&quot;, &quot;loli&quot;, age-play
          themes…), press <strong>Gallery OK — publish</strong>. If you see anything like that, reject with a short
          reason — the app is removed and never listed (07-LEGAL §2).
        </p>
        <ul className="flex flex-col gap-3">
          {ready.map((q) => (
            <li key={q.id} className="rounded border border-neutral-300 bg-white p-3">
              <div className="flex flex-wrap items-center gap-3">
                <strong>{q.name}</strong>
                <span>score {toTen(q.overall)}</span>
                {q.nsfwAllowed ? <span className="rounded bg-amber-100 px-1.5 text-xs">adult content</span> : null}
                <a href={q.websiteUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  Open site ↗
                </a>
                <a href={`/admin/apps/${q.id}`} className="underline">
                  Edit
                </a>
              </div>
              {q.factsNotes ? <p className="mt-1 text-xs text-neutral-600">Research notes: {q.factsNotes}</p> : null}
              <div className="mt-2 flex flex-wrap items-end gap-4">
                <MiniForm action={galleryOkPublishAction.bind(null, q.id)} submit="Gallery OK — publish">
                  {null}
                </MiniForm>
                <MiniForm action={rejectFromQueueAction.bind(null, q.id)} submit="Reject" danger>
                  <input
                    name="reason"
                    placeholder="Reason"
                    aria-label={`Reason to reject ${q.name}`}
                    className="rounded border border-neutral-300 px-2 py-1"
                  />
                </MiniForm>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">3. Not ready yet ({waiting.length})</h2>
        <p>
          Open the app (Edit), fix what&apos;s listed, and it moves up to &quot;ready&quot; by itself. How to fix each
          item:
        </p>
        <ul className="list-disc pl-5 text-neutral-700">
          <li>
            <strong>missing a sourced price</strong> — open the app&apos;s pricing page in your browser. In{" "}
            <em>Sources</em> add that URL (supports: <code>pricing</code>), then in <em>Pricing plans</em> add the
            cheapest monthly (or yearly) plan with that source. Scores and pros/cons update automatically.
          </li>
          <li>
            <strong>terms don&apos;t state 18+</strong> — open its Terms (or &quot;underage policy&quot;). If it says
            users must be 18+, add the URL as a source (<code>18+ requirement</code>) and tick &quot;Service states 18+
            only&quot; → Save. If it allows minors → Reject (adults-only rule).
          </li>
          <li>
            <strong>deepfake check not confirmed</strong> — if the site offers creating companions or images from real
            people&apos;s photos or celebrities → Reject. Otherwise tick &quot;No deepfake-of-real-person feature&quot;
            → Save.
          </li>
          <li>
            <strong>operator not identifiable / no privacy policy</strong> — look for company name and address in the
            footer, terms or imprint; add the source and tick the box. None found → leave it as a draft.
          </li>
          <li>
            <strong>missing 3 pros / 3 cons</strong> — too little public information; leave it as a draft for now.
          </li>
        </ul>
        <ul className="flex flex-col gap-1">
          {waiting.map((q) => (
            <li key={q.id}>
              <a href={`/admin/apps/${q.id}`} className="font-medium underline">
                {q.name}
              </a>{" "}
              — {q.blockers.join("; ")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
