const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * One website: main site at /, Family Store at /shop, Studio at /studio, admin at
 * /admin, and the API forwarded at /v1. NEXT_PUBLIC_* values are inlined at build time.
 */
export const env = {
  /** Server-side API base: the API runs next to the site (not for anything the browser loads). */
  apiUrl: process.env.API_URL ?? "http://localhost:4000/v1",
  /** API base for the browser: same origin through the /v1 rewrite. */
  publicApiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "/v1").replace(/\/$/, ""),
  siteUrl,
  storeUrl: process.env.NEXT_PUBLIC_STORE_URL ?? `${siteUrl}/shop`,
  studioUrl: process.env.NEXT_PUBLIC_STUDIO_URL ?? `${siteUrl}/studio`,
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL ?? `${siteUrl}/admin`,
};
