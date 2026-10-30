import { LOCALE_COOKIE } from "@snapbell/sdk";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Locale routing for the marketing site (every page lives under app/[locale]):
 * - English is served at unprefixed URLs: /pricing is rewritten to /en/pricing internally.
 * - /en/… is never public: 308 to the unprefixed URL (one canonical English URL per page).
 * - Someone who explicitly picked Russian or Uzbek (sb_locale cookie, set by the
 *   language switcher) is sent from an unprefixed URL to /ru/… or /uz/….
 * - Accept-Language is deliberately ignored: crawlers must always get the URL they asked for.
 */
const PREFIXED = new Set(["ru", "uz"]);
/** Metadata images Next links to as /en/…; they must stay reachable under the prefix. */
const METADATA_ASSET = /\/(opengraph-image|twitter-image|icon|apple-icon)(\/|$|-)/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";

  if (PREFIXED.has(first)) return NextResponse.next();

  if (first === "en") {
    if (METADATA_ASSET.test(pathname)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const preferred = request.cookies.get(LOCALE_COOKIE)?.value;
  if (preferred && PREFIXED.has(preferred)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url, 307);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except Next internals, the placeholder image route, SEO files and static files.
  matcher: ["/((?!_next/|ph\\.svg|sitemap\\.xml|robots\\.txt|favicon\\.ico|.*\\.[A-Za-z0-9]+$).*)"],
};
