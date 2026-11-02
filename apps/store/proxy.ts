import { LOCALE_COOKIE, isLocale } from "@snapbell/sdk";
import { NextResponse, type NextRequest } from "next/server";

/** Pages that need a verified parent (one-time code per device). */
const GATED = /^\/(?:a(?:\/|$)|cart$|checkout$|orders(?:\/|$)|account$)/;

/**
 * Family Store gate: albums, cart, checkout, orders and account need a verified
 * parent. Also remembers the last album opened so pages without a code in the URL
 * can show the studio's branding, and turns a `?lang=` link into the language cookie.
 */
export function proxy(req: NextRequest) {
  const { pathname, search, searchParams } = req.nextUrl;

  // Handoff from the main site: public, and it reads ?lang= itself (no extra redirect).
  if (pathname === "/auth/continue") return NextResponse.next();

  // Links from the marketing site or texts can carry ?lang=ru: remember it, then drop it from the URL.
  if (searchParams.has("lang")) {
    const lang = searchParams.get("lang");
    const url = req.nextUrl.clone();
    url.searchParams.delete("lang");
    const res = NextResponse.redirect(url);
    if (isLocale(lang)) {
      res.cookies.set(LOCALE_COOKIE, lang, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 365 * 86_400,
      });
    }
    return res;
  }

  if (!GATED.test(pathname)) return NextResponse.next();

  const albumMatch = /^\/a\/([^/]+)/.exec(pathname);
  const albumCode = albumMatch ? decodeURIComponent(albumMatch[1]!).toUpperCase().replace(/[^A-Z0-9]/g, "") : null;

  if (!req.cookies.get("sb_parent")?.value) {
    // Albums: verify with the album's code. Cart, checkout, orders, account: sign in.
    const url = req.nextUrl.clone();
    url.pathname = albumCode ? "/verify" : "/signin";
    url.search = "";
    if (albumCode) url.searchParams.set("code", albumCode);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (albumCode) {
    res.cookies.set("sb_album", albumCode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 90 * 86_400,
    });
  }
  return res;
}

export const config = {
  // Every page; not Next internals, icon routes or files with an extension (icon.svg, manifest.webmanifest).
  matcher: ["/((?!_next/|api/|icons/|apple-icon|.*\\.[^/]+$).*)"],
};
