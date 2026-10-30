import { isLocale, LOCALE_COOKIE } from "@snapbell/sdk";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/auth/"];

/**
 * `?lang=en|ru|uz` (links from the marketing site) stores the language and
 * redirects to the same URL without it. Every other page needs a staff session
 * cookie; the API validates it on each request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  const lang = searchParams.get("lang");
  if (lang !== null) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
    const res = NextResponse.redirect(url);
    if (isLocale(lang)) res.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 31_536_000, sameSite: "lax", httpOnly: false });
    return res;
  }

  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();
  if (request.cookies.has("sb_studio")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/|favicon.ico|.*\\.(?:svg|png|jpg|webp|ico)$).*)"],
};
