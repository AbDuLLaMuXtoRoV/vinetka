import { headers } from "next/headers";

/**
 * Pass the visitor's IP to the API. The API rate-limits code entry, one-time
 * codes and logins per IP and trusts X-Forwarded-For from private networks, so
 * without this every visitor would share the web server's single bucket.
 */
export async function forwardedHeaders(): Promise<Record<string, string>> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  return ip ? { "X-Forwarded-For": ip } : {};
}
