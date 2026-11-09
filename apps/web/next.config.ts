import type { NextConfig } from "next";

/** The API runs as its own process next to this site (scripts/start.mjs); /v1 is forwarded to it. */
const apiOrigin = (process.env.API_ORIGIN ?? "http://127.0.0.1:4000").replace(/\/$/, "");

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const config: NextConfig = {
  // packages/ui ships TypeScript source; packages/sdk is prebuilt.
  transpilePackages: ["@snapbell/ui"],
  reactStrictMode: true,
  poweredByHeader: false,
  // /signup and /signin on the main site are parent (shop customer) accounts. Studios never
  // sign themselves up: the Snapbell team creates them from /admin.
  async redirects() {
    // Partner terms are discussed privately, so the old public pricing page and the fees help
    // article send visitors to the contact page / payouts article. Config redirects run before
    // the site proxy, so the [locale] routes never see these paths.
    return [
      { source: "/:en(en)?/pricing", destination: "/contact", permanent: true },
      { source: "/:locale(ru|uz)/pricing", destination: "/:locale/contact", permanent: true },
      { source: "/:en(en)?/help/fees-and-payouts", destination: "/help/payouts", permanent: true },
      { source: "/:locale(ru|uz)/help/fees-and-payouts", destination: "/:locale/help/payouts", permanent: true },
    ];
  },
  async rewrites() {
    return {
      // Before the filesystem and the [locale] routes, so /v1 can never be mistaken for a page.
      beforeFiles: [{ source: "/v1/:path*", destination: `${apiOrigin}/v1/:path*` }],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    // The shop, studio and admin are private areas: never indexed.
    return ["/shop", "/shop/:path*", "/studio", "/studio/:path*", "/admin", "/admin/:path*"].map((source) => ({ source, headers: noindex }));
  },
};

export default config;
