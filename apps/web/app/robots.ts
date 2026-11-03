import type { MetadataRoute } from "next";
import { env } from "@site/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl.replace(/\/$/, "");
  // The public demo (NEXT_PUBLIC_DEMO_MODE) must not compete with the real site in search results.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    // /go/ only hands parents over to the shop; the shop, studio and admin are private areas.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/go/", "/shop", "/studio", "/admin", "/v1"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
