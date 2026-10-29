"use client";

import { useActionState } from "react";
import { PLATFORMS } from "@/lib/db/platforms";
import type { FormState } from "./actions";

type Values = Record<string, unknown>;
type Action = (prev: FormState, form: FormData) => Promise<FormState>;
const INITIAL: FormState = { seq: 0 };

const input = "w-full rounded border border-neutral-300 bg-white px-2 py-1.5";

function Err({ msg }: { msg?: string }) {
  return msg ? (
    <span role="alert" className="text-xs text-red-700">
      {msg}
    </span>
  ) : null;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function Text(p: {
  name: string;
  label: string;
  v: Values;
  e?: Record<string, string>;
  area?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{p.label}</span>
      {p.area ? (
        <textarea name={p.name} defaultValue={str(p.v[p.name])} rows={6} className={input} />
      ) : (
        <input name={p.name} defaultValue={str(p.v[p.name])} className={input} />
      )}
      {p.hint ? <span className="text-xs text-neutral-500">{p.hint}</span> : null}
      <Err msg={p.e?.[p.name]} />
    </label>
  );
}

function Check(p: { name: string; label: string; v: Values }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={p.name} defaultChecked={p.v[p.name] === true} />
      {p.label}
    </label>
  );
}

function FormError({ e }: { e?: Record<string, string> }) {
  const msg = e?._form ?? e?.status;
  return msg ? (
    <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">
      {msg}
    </p>
  ) : null;
}

/** Values for the form: what the user just typed (after an error) or the stored row (camelCase keys). */
export function AppForm(props: { action: Action; initial: Values; categories: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(props.action, INITIAL);
  const v = state.values ?? props.initial;
  const e = state.errors;
  const platforms = Array.isArray(v.platforms) ? (v.platforms as string[]) : [];
  const cats = Array.isArray(v.categoryIds) ? (v.categoryIds as string[]) : [];
  const free =
    v.hasFreePlan === true || v.hasFreePlan === "yes"
      ? "yes"
      : v.hasFreePlan === false || v.hasFreePlan === "no"
        ? "no"
        : "unknown";
  return (
    <form key={state.seq} action={formAction} className="flex flex-col gap-6">
      <FormError e={e} />
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Basics</legend>
        <Text name="name" label="Name" v={v} e={e} />
        <Text name="slug" label="Slug" v={v} e={e} hint="lowercase-kebab-case, used in URLs" />
        <Text name="tagline" label="Tagline" v={v} e={e} />
        <Text name="websiteUrl" label="Website URL" v={v} e={e} />
        <div className="sm:col-span-2">
          <Text name="descriptionMd" label="Description (Markdown, SFW)" v={v} e={e} area />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">Pricing (source URL goes in Sources — TASK-011d)</legend>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Free plan</span>
          <select name="hasFreePlan" defaultValue={free} className={input}>
            <option value="unknown">unknown</option>
            <option value="yes">yes</option>
            <option value="no">no</option>
          </select>
        </label>
        <Text name="startingPriceCents" label="Starting price" v={v} e={e} hint="e.g. 9.99 (stored as cents)" />
        <Text name="currency" label="Currency" v={v} e={e} hint="EUR, USD…" />
      </fieldset>

      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-2 font-semibold">Platforms</legend>
        {PLATFORMS.map((p) => (
          <label key={p} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="platforms" value={p} defaultChecked={platforms.includes(p)} />
            {p}
          </label>
        ))}
        <Err msg={e?.platforms} />
      </fieldset>

      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">Features</legend>
        <Check name="featVoice" label="Voice" v={v} />
        <Check name="featImageGen" label="Image generation" v={v} />
        <Check name="featVideo" label="Video" v={v} />
        <Check name="featLongTermMemory" label="Long-term memory" v={v} />
        <Check name="featGroupChat" label="Group chat" v={v} />
        <Check name="featCustomCharacter" label="Custom character" v={v} />
        <Check name="featApi" label="API" v={v} />
        <Check name="nsfwAllowed" label="NSFW allowed (fact only, details behind age gate)" v={v} />
        <Check name="nsfwRequiresToggle" label="NSFW needs a toggle" v={v} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">Operator</legend>
        <Text name="companyName" label="Company" v={v} e={e} />
        <Text name="companyCountry" label="Country" v={v} e={e} hint="ISO code, e.g. US" />
        <Text name="privacyPolicyUrl" label="Privacy policy URL" v={v} e={e} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">Editorial scores (0–100, our own rating — never payout-based)</legend>
        <Text name="scoreConversation" label="Conversation" v={v} e={e} />
        <Text name="scoreMemory" label="Memory" v={v} e={e} />
        <Text name="scoreCustomization" label="Customization" v={v} e={e} />
        <Text name="scoreMedia" label="Media" v={v} e={e} />
        <Text name="scoreValue" label="Value" v={v} e={e} />
        <Text name="scorePrivacy" label="Privacy" v={v} e={e} />
        <Text name="scoreConversationNote" label="Why (conversation)" v={v} e={e} />
        <Text name="scoreMemoryNote" label="Why (memory)" v={v} e={e} />
        <Text name="scoreCustomizationNote" label="Why (customization)" v={v} e={e} />
        <Text name="scoreMediaNote" label="Why (media)" v={v} e={e} />
        <Text name="scoreValueNote" label="Why (value)" v={v} e={e} />
        <Text name="scorePrivacyNote" label="Why (privacy)" v={v} e={e} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">Review (SFW language — public pages)</legend>
        <Text name="pros" label="Pros (one per line, max 5)" v={v} e={e} area />
        <Text name="cons" label="Cons (one per line, max 5)" v={v} e={e} area />
        <Text name="bestFor" label="Best for (one per line, max 6)" v={v} e={e} area />
        <div className="sm:col-span-3">
          <Text name="verdictMd" label="Verdict" v={v} e={e} area />
        </div>
        <p className="text-xs text-neutral-600 sm:col-span-3">
          Publishing needs all six scores with a reason, a verdict, 3–5 pros, 3–5 cons and at least one sourced price
          (quality gate, ADR-026).
        </p>
      </fieldset>

      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-2 font-semibold">Categories</legend>
        {props.categories.length === 0 ? <span className="text-sm text-neutral-500">No categories yet.</span> : null}
        {props.categories.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={cats.includes(c.id)} />
            {c.name}
          </label>
        ))}
        <Err msg={e?.categoryIds} />
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-4">
        <legend className="px-1 font-semibold">
          Compliance checklist (07-LEGAL §2) — all five required to publish
        </legend>
        <Check name="chk18PlusTerms" label="Service states 18+ only in its terms" v={v} />
        <Check name="chkNoMinorContent" label="No minor-coded content in public galleries / marketing" v={v} />
        <Check name="chkNoDeepfakeFeature" label="No deepfake-of-real-person feature as a selling point" v={v} />
        <Check name="chkPrivacyPolicy" label="Privacy policy exists and is linked" v={v} />
        <Check name="chkOperatorIdentifiable" label="Company / operator identifiable" v={v} />
        <Text name="checklistNote" label="Checklist note (where you checked, date)" v={v} e={e} area />
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-neutral-900 px-4 py-2 font-medium text-white"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

export function StatusForm(props: {
  action: Action;
  status: string;
  removalReason: string | null;
  canPublish: boolean;
}) {
  const [state, formAction, pending] = useActionState(props.action, INITIAL);
  const v = state.values ?? { status: props.status, removalReason: props.removalReason };
  return (
    <form key={state.seq} action={formAction} className="flex flex-col gap-3 text-sm">
      <FormError e={state.errors} />
      <label className="flex flex-col gap-1">
        <span className="font-medium">Status</span>
        <select name="status" defaultValue={str(v.status)} className={input}>
          <option value="draft">draft</option>
          <option value="published" disabled={!props.canPublish}>
            published{props.canPublish ? "" : " (checklist incomplete)"}
          </option>
          <option value="paused">paused</option>
          <option value="removed">removed</option>
        </select>
      </label>
      <Text name="removalReason" label="Removal reason (required for removed)" v={v} e={state.errors} />
      <button type="submit" disabled={pending} className="self-start rounded border border-neutral-400 px-3 py-1.5">
        Change status
      </button>
    </form>
  );
}

export function CategoryForm(props: {
  action: Action;
  initial: Values;
  parents: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(props.action, INITIAL);
  const v = state.values ?? props.initial;
  const e = state.errors;
  return (
    <form key={state.seq} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError e={e} />
      </div>
      <Text name="name" label="Name" v={v} e={e} />
      <Text name="slug" label="Slug" v={v} e={e} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Parent</span>
        <select name="parentId" defaultValue={str(v.parentId)} className={input}>
          <option value="">— none —</option>
          {props.parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Err msg={e?.parentId} />
      </label>
      <Text name="sort" label="Sort" v={v} e={e} />
      <div className="sm:col-span-2">
        <Text name="description" label="Description" v={v} e={e} area />
      </div>
      <Check name="isNsfw" label="NSFW category (only behind the age gate)" v={v} />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-neutral-900 px-4 py-2 font-medium text-white"
      >
        {props.submitLabel}
      </button>
    </form>
  );
}
