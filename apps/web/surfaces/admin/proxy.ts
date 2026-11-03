import { isLocale, LOCALE_COOKIE } from "@snapbell/sdk";
import { NextResponse, type NextRequest } from "next/server";

const PREFIX = "/admin";

/**
 * `?lang=` stores the language and redirects without it.
 * Internal tool: every other page needs the admin session cookie.
 */
export function proxy(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  if (lang !== null) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
    const res = NextResponse.redirect(url);
    if (isLocale(lang)) res.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 31_536_000, sameSite: "lax", httpOnly: false });
    return res;
  }
  const rel = request.nextUrl.pathname.slice(PREFIX.length) || "/";
  if (rel.startsWith("/login") || request.cookies.has("sb_admin")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `${PREFIX}/login`;
  url.search = "";
  return NextResponse.redirect(url);
}
