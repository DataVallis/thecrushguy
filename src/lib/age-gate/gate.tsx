import "server-only";
import { cookies, headers } from "next/headers";
import { gateDecision, regionFromHeaders, selfDeclaration, type GateDecision } from "./policy";
import { GatedContent } from "./view";

/** Current visitor's decision. Request-time only (reads cookies + headers). */
export async function ageGateDecision(): Promise<GateDecision> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return gateDecision(
    regionFromHeaders((n) => h.get(n)),
    selfDeclaration.isVerified((n) => c.get(n)?.value),
  );
}

/**
 * Wrap every NSFW section in this (inside a <Suspense>). Everyone without a verified cookie — bots included —
 * gets the same SFW gate, so there is no cloaking. Pages that contain gated sections must be `noindex`.
 */
export async function NsfwSection(props: { returnTo: string; children: React.ReactNode }) {
  const decision = await ageGateDecision();
  return (
    <GatedContent decision={decision} returnTo={props.returnTo}>
      {props.children}
    </GatedContent>
  );
}
