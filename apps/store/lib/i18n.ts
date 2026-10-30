import { LOCALE_COOKIE, isLocale, negotiateLocale, type Locale } from "@snapbell/sdk";
import { cookies, headers } from "next/headers";
import { cache } from "react";

/**
 * Language for this request: the parent's choice (sb_locale cookie, set by the
 * switcher or a `?lang=` link), else the browser's Accept-Language, else English.
 * No URL prefixes, so album links in texts and on flyers keep working.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  return negotiateLocale((await headers()).get("accept-language"));
});
