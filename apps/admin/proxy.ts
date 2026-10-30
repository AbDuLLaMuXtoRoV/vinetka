import { isLocale, LOCALE_COOKIE } from "@snapbell/sdk";
import { NextResponse, type NextRequest } from "next/server";

/**
 * `?lang=en|ru|uz` stores the language and redirects without it.
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
  if (request.nextUrl.pathname.startsWith("/login") || request.cookies.has("sb_admin")) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
