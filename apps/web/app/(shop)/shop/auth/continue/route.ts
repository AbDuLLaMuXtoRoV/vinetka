import { LOCALE_COOKIE, createClient, isLocale } from "@snapbell/sdk";
import type { NextRequest } from "next/server";
import { redirectToPath } from "@web/surfaces/shared/redirect";
import { PARENT_COOKIE, PARENT_NAME_COOKIE, cookieOptions, parentDisplayName, safeNext } from "@shop/lib/api";
import { env } from "@shop/lib/env";
import { forwardedHeaders } from "@shop/lib/forwarded";
import { getLocale } from "@shop/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * Arrival from the main site: /auth/continue?code=…&next=/account&lang=ru.
 * The one-time handoff code (60 s, single use) becomes a shop session, so a
 * parent signed in on the main site lands here signed in.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  // The main site sends shop-relative paths ("/account"); the shop lives under /shop.
  const raw = safeNext(sp.get("next"));
  const next = !raw ? "/shop/account" : /^\/shop(?:[/?#]|$)/.test(raw) ? raw : `/shop${raw === "/" ? "" : raw}`;
  const lang = sp.get("lang");
  const locale = isLocale(lang) ? lang : await getLocale();
  const code = sp.get("code") ?? "";

  // Relative redirect: request.nextUrl points at the bind address behind `next start -H 0.0.0.0`.
  const go = (path: string) => {
    const res = redirectToPath(path, 302);
    if (isLocale(lang)) res.cookies.set(LOCALE_COOKIE, lang, { ...cookieOptions(365), httpOnly: false });
    return res;
  };

  if (code) {
    try {
      const api = createClient({ baseUrl: env.apiUrl, locale, headers: await forwardedHeaders() });
      const session = await api.auth.redeemParentHandoff({ code });
      const res = go(next);
      res.cookies.set(PARENT_COOKIE, session.token, cookieOptions(90));
      res.cookies.set(PARENT_NAME_COOKIE, parentDisplayName(session.parent), { ...cookieOptions(90), httpOnly: false });
      return res;
    } catch {
      // Expired or already used: sign in here instead.
    }
  }
  return go(`/shop/signin?next=${encodeURIComponent(next)}`);
}
