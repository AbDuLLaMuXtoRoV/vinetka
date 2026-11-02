import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl.replace(/\/$/, "");
  // The public demo (NEXT_PUBLIC_DEMO_MODE) must not compete with the real site in search results.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    // /go/ only hands parents over to the shop; account pages are noindex.
    rules: [{ userAgent: "*", allow: "/", disallow: "/go/" }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
