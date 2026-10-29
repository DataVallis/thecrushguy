import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { CookieSettingsLink } from "./analytics";

export function SiteHeader({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <header className="border-b border-ink/10 bg-paper/90">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">
        {t.nav.skip}
      </a>
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href={`/${locale}`} aria-label={t.nav.home}>
          <Image src="/logo.svg" alt="The Crush Guy" width={175} height={30} priority />
        </Link>
        <nav className="ml-auto flex items-center gap-5 text-sm font-semibold">
          <Link href={`/${locale}#shortlist`} className="hover:underline">
            {t.nav.allApps}
          </Link>
          <Link href={`/${locale}/how-we-rank`} className="hidden hover:underline sm:inline">
            {t.nav.howWeRank}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ locale, t }: { locale: Locale; t: Dictionary }) {
  const links: [string, string][] = [
    ["about", t.footer.about],
    ["how-we-rank", t.footer.howWeRank],
    ["affiliate-disclosure", t.footer.disclosure],
    ["privacy", t.footer.privacy],
    ["terms", t.footer.terms],
    ["imprint", t.footer.imprint],
    ["contact", t.footer.contact],
  ];
  return (
    <footer className="mt-16 border-t border-ink/10 bg-lavender">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted">
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map(([path, label]) => (
            <Link key={path} href={`/${locale}/${path}`} className="hover:underline">
              {label}
            </Link>
          ))}
          <CookieSettingsLink label={t.consent.settings} />
        </nav>
        <p>{t.footer.note}</p>
        <p>{t.footer.wellbeing}</p>
      </div>
    </footer>
  );
}

/** Required on every money page (06-SEO-CONTENT, 07-LEGAL §2.6). */
export function Disclosure({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <p className="text-xs text-muted">
      {t.disclosure.line}{" "}
      <Link href={`/${locale}/affiliate-disclosure`} className="underline">
        {t.disclosure.link}
      </Link>
    </p>
  );
}
