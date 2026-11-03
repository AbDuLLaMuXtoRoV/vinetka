import { NextResponse } from "next/server";

/**
 * Redirect to a path on this site using a relative Location header.
 *
 * Behind `next start -H 0.0.0.0` (as on Render), `request.url` and
 * `request.nextUrl` in route handlers point at the bind address
 * (http://0.0.0.0:PORT). Absolute redirects built from them send browsers to an
 * unreachable host and lose the cookies just set. A relative Location resolves
 * against whatever address the browser is actually on.
 */
export function redirectToPath(path: string, status: 302 | 303 | 307 = 307): NextResponse {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    throw new Error(`redirectToPath expects a same-site path, got ${path}`);
  }
  return new NextResponse(null, { status, headers: { Location: path, "Cache-Control": "no-store" } });
}
