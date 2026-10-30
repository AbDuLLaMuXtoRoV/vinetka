import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Upload relay, used only when a direct PUT to the presigned URL fails in the
 * browser (e.g. the dev API without CORS). Restricted to the API's own origin so
 * it can't be used to reach arbitrary hosts. Production uploads go straight to S3/R2.
 */
export async function PUT(request: NextRequest) {
  const target = request.headers.get("x-upload-url");
  if (!target || !request.cookies.has("sb_studio")) return NextResponse.json({ message: "Bad request" }, { status: 400 });
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return NextResponse.json({ message: "Bad upload URL" }, { status: 400 });
  }
  if (url.origin !== new URL(env.apiUrl).origin) return NextResponse.json({ message: "Upload host not allowed" }, { status: 403 });

  const headers: Record<string, string> = {};
  for (const [k, v] of request.headers) {
    if (k.startsWith("x-upload-header-")) headers[k.slice("x-upload-header-".length)] = v;
  }
  const res = await fetch(url, { method: "PUT", headers, body: await request.arrayBuffer() });
  return new NextResponse(await res.text(), { status: res.status });
}
