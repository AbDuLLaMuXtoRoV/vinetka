import { isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from "@snapbell/sdk";
import { cookies, headers } from "next/headers";
import { cache } from "react";

/**
 * The studio's language, server-side: the sb_locale cookie (set by the language
 * switcher or a `?lang=` link) wins, then the browser's Accept-Language, then English.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return negotiateLocale((await headers()).get("accept-language"));
});
