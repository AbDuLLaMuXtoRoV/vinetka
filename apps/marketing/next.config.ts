import type { NextConfig } from "next";

const config: NextConfig = {
  // packages/ui ships TypeScript source; packages/sdk is prebuilt.
  transpilePackages: ["@snapbell/ui"],
  reactStrictMode: true,
  poweredByHeader: false,
  // /signup and /signin are parent (shop customer) accounts. Studios never sign
  // themselves up: the Snapbell team creates them from Admin.
};

export default config;
