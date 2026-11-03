import type { NextRequest } from "next/server";
import { proxy as adminProxy } from "@admin/proxy";
import { proxy as shopProxy } from "@shop/proxy";
import { proxy as siteProxy } from "@site/proxy";
import { proxy as studioProxy } from "@studio/proxy";

/**
 * One site, four areas. Each area keeps its own rules:
 *   /shop/…   Family Store: parent session gate, last album, ?lang=
 *   /studio/… Studio: staff session gate, ?lang=, public login/setup pages
 *   /admin/…  Snapbell admin: admin session gate, ?lang=
 *   anything else: the main site's language routing (/, /ru/…, /uz/…)
 * /v1 (the API) never reaches this proxy: next.config forwards it before routing.
 */
export function proxy(request: NextRequest) {
  const area = request.nextUrl.pathname.split("/")[1] ?? "";
  if (area === "shop") return shopProxy(request);
  if (area === "studio") return studioProxy(request);
  if (area === "admin") return adminProxy(request);
  return siteProxy(request);
}

export const config = {
  // Everything except Next internals, the API, the /go handoff, the placeholder image route,
  // SEO files and files with an extension (icons, manifest.webmanifest, …).
  matcher: ["/((?!_next/|v1/|v1$|go/|ph\\.svg|sitemap\\.xml|robots\\.txt|favicon\\.ico|.*\\.[A-Za-z0-9]+$).*)"],
};
