import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/app-icon";

const SIZES = new Set([192, 512]);

/** PNG icons referenced by the web app manifest. */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  return new ImageResponse(<AppIconArt size={size} />, {
    width: size,
    height: size,
    headers: { "Cache-Control": "public, max-age=604800, immutable" },
  });
}
