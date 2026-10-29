"use client";

/**
 * Google Analytics 4 with consent (TASK-022, ADR-034). EU rules (ePrivacy/GDPR): nothing from Google loads until the
 * visitor clicks "Allow". The choice is kept in the `tcg_consent` cookie (1 year) and can be changed any time via
 * "Cookie settings" in the footer. Outbound /go clicks are sent as `visit_app` events.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

const COOKIE = "tcg_consent";
type Choice = "granted" | "denied" | null;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readChoice(): Choice {
  const m = document.cookie.match(/(?:^|; )tcg_consent=(granted|denied)/);
  return (m?.[1] as Choice) ?? null;
}

function saveChoice(c: Exclude<Choice, null>) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${c}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${secure}`;
}

function loadGa(id: string) {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export type ConsentText = { text: string; allow: string; deny: string; more: string; settings: string };

const CHANGED = "tcg:consent-changed";
const subscribe = (cb: () => void) => {
  window.addEventListener(CHANGED, cb);
  return () => window.removeEventListener(CHANGED, cb);
};

export function Analytics({ id, text, privacyHref }: { id: string; text: ConsentText; privacyHref: string }) {
  // Server render and hydration see "unknown" (nothing shown); the browser then reads the cookie.
  const stored = useSyncExternalStore<Choice | "unknown">(subscribe, readChoice, () => "unknown");
  const [reopened, setReopened] = useState(false);
  const choice = reopened ? null : stored;

  useEffect(() => {
    if (readChoice() === "granted") loadGa(id);
    const reopen = () => setReopened(true);
    window.addEventListener("tcg:cookie-settings", reopen);
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="/go/"]') as HTMLAnchorElement | null;
      if (!a || !window.gtag) return;
      const u = new URL(a.href);
      window.gtag("event", "visit_app", {
        app: u.pathname.split("/")[2],
        placement: u.searchParams.get("p") ?? "unknown",
        transport_type: "beacon",
      });
    };
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("tcg:cookie-settings", reopen);
      document.removeEventListener("click", onClick);
    };
  }, [id]);

  if (choice !== null) return null;
  const decide = (c: Exclude<Choice, null>) => {
    saveChoice(c);
    setReopened(false);
    window.dispatchEvent(new Event(CHANGED));
    if (c === "granted") loadGa(id);
    else if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
  };
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={text.settings}
      className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-xl rounded-3xl border border-ink/10 bg-white p-4 text-sm shadow-[0_20px_50px_-20px_rgba(27,21,48,0.5)] sm:bottom-6"
    >
      <p>
        {text.text}{" "}
        <a href={privacyHref} className="underline">
          {text.more}
        </a>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => decide("granted")}
          className="rounded-full bg-ink px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
        >
          {text.allow}
        </button>
        <button
          type="button"
          onClick={() => decide("denied")}
          className="rounded-full border border-ink/20 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
        >
          {text.deny}
        </button>
      </div>
    </div>
  );
}

/** Footer link that reopens the consent box. */
export function CookieSettingsLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="hover:underline"
      onClick={() => window.dispatchEvent(new Event("tcg:cookie-settings"))}
    >
      {label}
    </button>
  );
}
