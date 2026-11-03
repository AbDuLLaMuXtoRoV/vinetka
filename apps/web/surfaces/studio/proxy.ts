import { isLocale, LOCALE_COOKIE } from "@snapbell/sdk";
import { NextResponse, type NextRequest } from "next/server";

const PREFIX = "/studio";

/**
 * Public studio pages, relative to /studio: login, magic links, the one-time setup
 * link for new owners and invited staff, and the upload relay (it checks the
 * session itself and answers with JSON instead of a redirect).
 */
const PUBLIC = ["/login", "/auth/", "/setup", "/api/"];

/**
 * `?lang=en|ru|uz` (links from the main site) stores the language and redirects
 * to the same URL without it. Every other page needs a staff session cookie; the
 * API validates it on each request and role-gated pages check the role.
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const rel = pathname.slice(PREFIX.length) || "/";

  const lang = searchParams.get("lang");
  if (lang !== null) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("lang");
    const res = NextResponse.redirect(url);
    if (isLocale(lang)) res.cookies.set(LOCALE_COOKIE, lang, { path: "/", maxAge: 31_536_000, sameSite: "lax", httpOnly: false });
    return res;
  }

  if (PUBLIC.some((p) => rel === p || rel.startsWith(p))) return NextResponse.next();
  if (request.cookies.has("sb_studio")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `${PREFIX}/login`;
  url.search = rel === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}
