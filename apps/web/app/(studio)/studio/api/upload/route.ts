import { NextResponse, type NextRequest } from "next/server";
import { env } from "@studio/lib/env";

/**
 * Upload relay, used only when a direct PUT to the presigned URL fails in the
 * browser (e.g. the dev API without CORS). It only ever forwards to our own API's
 * upload sink (the internal API address), whatever host the ticket names, so it
 * can't be used to reach anything else. Production uploads go straight to S3/R2.
 */
export async function PUT(request: NextRequest) {
  const target = request.headers.get("x-upload-url");
  if (!target || !request.cookies.has("sb_studio")) return NextResponse.json({ message: "Bad request" }, { status: 400 });
  let url: URL;
  try {
    url = new URL(target, request.nextUrl.origin);
  } catch {
    return NextResponse.json({ message: "Bad upload URL" }, { status: 400 });
  }
  if (!/^\/v1\/uploads\/[^/]+\/content$/.test(url.pathname)) return NextResponse.json({ message: "Upload host not allowed" }, { status: 403 });
  const forward = new URL(url.pathname + url.search, new URL(env.apiUrl).origin);

  const headers: Record<string, string> = {};
  for (const [k, v] of request.headers) {
    if (k.startsWith("x-upload-header-")) headers[k.slice("x-upload-header-".length)] = v;
  }
  const res = await fetch(forward, { method: "PUT", headers, body: await request.arrayBuffer() });
  return new NextResponse(await res.text(), { status: res.status });
}
