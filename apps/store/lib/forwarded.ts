import { headers } from "next/headers";

/**
 * Pass the visitor's IP to the API. The API rate-limits code entry, one-time
 * codes and logins per IP, so without this every visitor would share the web
 * server's single bucket.
 *
 * Behind Render/Cloudflare the real client is in True-Client-IP or
 * CF-Connecting-IP; elsewhere it is the first X-Forwarded-For entry. When
 * INTERNAL_PROXY_SECRET is set (production), the IP travels in a header the API
 * only trusts alongside that secret, so it survives any proxies in between.
 */
export async function forwardedHeaders(): Promise<Record<string, string>> {
  const h = await headers();
  const ip =
    h.get("true-client-ip")?.trim() ||
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim();
  if (!ip) return {};
  const secret = process.env.INTERNAL_PROXY_SECRET;
  return secret
    ? { "X-Forwarded-For": ip, "X-Snapbell-Client-IP": ip, "X-Snapbell-Proxy-Secret": secret }
    : { "X-Forwarded-For": ip };
}
