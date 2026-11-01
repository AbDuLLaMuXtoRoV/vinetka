import type { NextConfig } from "next";

const config: NextConfig = {
  // packages/ui ships TypeScript source; packages/sdk is prebuilt.
  transpilePackages: ["@snapbell/ui"],
  reactStrictMode: true,
  poweredByHeader: false,
  // Studios no longer sign themselves up: the Snapbell team creates their accounts.
  async redirects() {
    return [
      { source: "/signup", destination: "/contact", permanent: true },
      { source: "/:locale(ru|uz|en)/signup", destination: "/:locale/contact", permanent: true },
    ];
  },
};

export default config;
