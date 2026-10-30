import { renderPlaceholderPhoto } from "@snapbell/sdk";
import type { NextRequest } from "next/server";

const KINDS = new Set(["portrait", "group", "action"]);

/** Placeholder illustration as SVG: /ph.svg?s=seed&k=group&w=watermark&o=overlay. Text is length-capped and XML-escaped by the renderer. */
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const seed = (q.get("s") ?? "snapbell").slice(0, 64);
  const kind = q.get("k") ?? "portrait";
  const svg = renderPlaceholderPhoto({
    seed,
    kind: (KINDS.has(kind) ? kind : "portrait") as "portrait" | "group" | "action",
    watermark: q.get("w")?.slice(0, 80) ?? null,
    overlay: q.get("o")?.slice(0, 80) ?? null,
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
