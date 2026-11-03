import { INTL_LOCALE, LOCALES, isLocale, type Locale } from "@snapbell/sdk";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * URL-based locales for SEO: English at unprefixed paths (/pricing), Russian
 * and Uzbek under /ru and /uz. proxy.ts rewrites unprefixed paths to /en
 * internally, so every page lives under app/[locale].
 */
export { LOCALES, type Locale };

export const PREFIXED_LOCALES = LOCALES.filter((l) => l !== "en");

export const OG_LOCALE: Record<Locale, string> = { en: "en_US", ru: "ru_RU", uz: "uz_UZ" };

/** "/pricing" → "/ru/pricing" (unchanged for English). Keeps any #hash or ?query. */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === "en") return clean;
  if (clean === "/") return `/${locale}`;
  if (clean.startsWith("/#") || clean.startsWith("/?")) return `/${locale}${clean.slice(1)}`;
  return `/${locale}${clean}`;
}

/**
 * Splits a pathname into its locale and the unprefixed path. Accepts the
 * internal /en/… form too (what prerendered English pages see), so "/en/pricing"
 * and "/pricing" both give "/pricing".
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, first = "", ...rest] = pathname.split("/");
  if (isLocale(first)) return { locale: first, path: `/${rest.join("/")}` };
  return { locale: "en", path: pathname || "/" };
}

/** The canonical (visible) href of the current page. */
export function canonicalPath(pathname: string): string {
  const { locale, path } = splitLocale(pathname);
  return localePath(locale, path);
}

/** Cross-site link to the store or studio, telling it which language to use. */
export function withLang(url: string, locale: Locale): string {
  const [base, hash] = url.split("#");
  const sep = base!.includes("?") ? "&" : "?";
  return `${base}${sep}lang=${locale}${hash ? `#${hash}` : ""}`;
}

/** Canonical + hreflang alternates for a page path (unprefixed, e.g. "/pricing"). */
export function alternates(locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localePath(locale, path),
    languages: {
      en: localePath("en", path),
      ru: localePath("ru", path),
      uz: localePath("uz", path),
      "x-default": localePath("en", path),
    },
  };
}

/** Shared per-page metadata: title, description, OpenGraph with locale, hreflang alternates. */
export function pageMetadata(
  locale: Locale,
  path: string,
  meta: { title: string | { absolute: string }; description: string; ogTitle?: string; type?: "website" | "article" },
  extra: Partial<Metadata> = {},
): Metadata {
  const ogTitle = meta.ogTitle ?? (typeof meta.title === "string" ? meta.title : meta.title.absolute);
  return {
    title: meta.title,
    description: meta.description,
    alternates: alternates(locale, path),
    ...extra,
    openGraph: {
      type: meta.type ?? "website",
      title: ogTitle,
      description: meta.description,
      url: localePath(locale, path),
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      ...(extra.openGraph ?? {}),
    },
  };
}

/** Params for every page under app/[locale]. */
export function localeParams(): Array<{ locale: Locale }> {
  return LOCALES.map((locale) => ({ locale }));
}

/** Reads and validates the [locale] segment. */
export async function getLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}

export function htmlLang(locale: Locale): string {
  return INTL_LOCALE[locale];
}
