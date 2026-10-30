import type { NextConfig } from "next";

const config: NextConfig = {
  // packages/ui ships TypeScript source; packages/sdk is prebuilt.
  transpilePackages: ["@snapbell/ui"],
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default config;
