import { isLocale } from "@snapbell/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { PARENT_COOKIE, PARENT_NAME_COOKIE, WELCOME_COOKIE, safeStorePath } from "@site/lib/parent-links";
import { storeDestination } from "@site/lib/parent-session";

export const dynamic = "force-dynamic";

/**
 * Every main-site link into the shop: /go/store?to=/account&lang=ru.
 * Signed-in parents arrive in the shop signed in (one-time handoff code).
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const to = safeStorePath(sp.get("to"));
  const lang = sp.get("lang");
  const locale = isLocale(lang) ? lang : "en";
  const { url, sessionExpired } = await storeDestination(to, locale, request.cookies.get(PARENT_COOKIE)?.value ?? null);

  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "no-store");
  if (sessionExpired) {
    for (const name of [PARENT_COOKIE, PARENT_NAME_COOKIE, WELCOME_COOKIE]) res.cookies.delete(name);
  }
  return res;
}
