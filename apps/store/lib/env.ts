/** Cross-surface URLs. Override per environment; defaults match `pnpm dev` ports. */
export const env = {
  apiUrl: process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  storeUrl: process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3001",
  studioUrl: process.env.NEXT_PUBLIC_STUDIO_URL ?? "http://localhost:3002",
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3003",
};
