# Routing, i18n and indexing — Status: Live on dev (2026-10-29)

## URL shape
- Public pages live under `/{locale}/…` (`src/app/[locale]/`). `[locale]` is the root segment, so `<html lang>` is always correct.
- Not localized: `/api/*`, `/go/*`, `/admin*`, `/robots.txt`, `/sitemap.xml`, files with an extension (from `public/`).

## Locale negotiation (`src/proxy.ts` → `src/lib/routing.ts`)
- A request without a supported locale prefix gets **307** to `/{locale}{path}{query}`.
- Locale = first language in `Accept-Language` (by q-value) that is in `publishedLocales`; otherwise `defaultLocale` (`en`).
- Region tags collapse to the language (`de-AT` → `de`). `q=0` is ignored.

## Locales (`src/i18n/config.ts`)
- `locales` = routes + dictionaries that exist (`en`, `de`).
- `publishedLocales` = locales allowed to be indexed and negotiated (`en` only). `de` is a scaffold test locale: it renders, but with `<meta name="robots" content="noindex, nofollow">`.
- Dictionaries: `src/i18n/messages/<locale>.json`, typed from `en.json`; loaded server-side by `getDictionary(locale)`.
- Publishing a new locale (ADR-012/016): translated + reviewed dictionary and content, then `hreflang` + `x-default`, per-locale canonical and sitemap (TASK-014), then add it to `publishedLocales`.

## Indexing guard
- `APP_ENV` is read at runtime (`src/lib/env.ts`). Only `prod` is indexable; unknown values fall back to `local`.
- Non-prod: every response through the proxy gets `X-Robots-Tag: noindex, nofollow`; `/robots.txt` returns `Disallow: /`.
- Prod: no `X-Robots-Tag`; `/robots.txt` allows `/` and disallows `/go/`, `/api/`, `/admin`.
