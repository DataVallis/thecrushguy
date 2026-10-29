import { safeReturnPath, type GateDecision } from "./policy";

/** Pure rendering of a gated section (tested without a request). Strings: English until TASK-012 adds i18n. */
export function GatedContent(props: { decision: GateDecision; returnTo: string; children: React.ReactNode }) {
  if (props.decision === "show") return <>{props.children}</>;
  if (props.decision === "blocked")
    return (
      <div data-age-gate="blocked" className="rounded border border-neutral-300 p-4 text-sm">
        This section isn&apos;t available in your region.
      </div>
    );
  return (
    <div data-age-gate="gate" className="rounded border border-neutral-300 p-4 text-sm">
      <p className="mb-3">This section is for adults only. Please confirm you are 18 or older.</p>
      <form action="/api/age-gate" method="post">
        <input type="hidden" name="next" value={safeReturnPath(props.returnTo)} />
        <button type="submit" name="confirm" value="yes" className="rounded bg-neutral-900 px-3 py-1.5 text-white">
          I am 18 or older
        </button>
      </form>
    </div>
  );
}
