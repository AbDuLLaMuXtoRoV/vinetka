import { ApiError, createClient, type Locale, type Parent } from "@snapbell/sdk";
import { cookies } from "next/headers";
import { env } from "./env";
import { forwardedHeaders } from "./forwarded";
import { withLang } from "./i18n";
import { PARENT_COOKIE, PARENT_NAME_COOKIE, WELCOME_COOKIE } from "./parent-links";

/** Server-only helpers for the parent session on the main site. */

const NINETY_DAYS = 90 * 86_400;
const base = { sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

/** Name for the header: the parent's name, otherwise a masked email or phone. */
export function displayName(parent: Pick<Parent, "name" | "email" | "phone">): string {
  if (parent.name?.trim()) return parent.name.trim();
  if (parent.email) {
    const [user = "", domain = ""] = parent.email.split("@");
    return `${user.slice(0, 1)}•••@${domain}`;
  }
  if (parent.phone) return `•••${parent.phone.slice(-4)}`;
  return "•••";
}

export async function setParentSession(token: string, name: string): Promise<void> {
  const jar = await cookies();
  jar.set(PARENT_COOKIE, token, { ...base, httpOnly: true, maxAge: NINETY_DAYS });
  // Next encodes cookie values, so names in Cyrillic or with ʻ survive; the browser decodes them.
  jar.set(PARENT_NAME_COOKIE, name, { ...base, httpOnly: false, maxAge: NINETY_DAYS });
  jar.set(WELCOME_COOKIE, "1", { ...base, httpOnly: false, maxAge: 120 });
}

export async function clearParentSession(): Promise<void> {
  const jar = await cookies();
  // The shop shares these cookies on one site: signing out here signs out of the shop too.
  for (const name of [PARENT_COOKIE, PARENT_NAME_COOKIE, WELCOME_COOKIE, "sb_cart", "sb_album"]) jar.delete(name);
}

/** The shop is served from this same site (/shop), so the login cookie is already shared. */
function storeIsSameSite(): boolean {
  try {
    return new URL(env.storeUrl, env.siteUrl).origin === new URL(env.siteUrl).origin;
  } catch {
    return false;
  }
}

export async function parentToken(): Promise<string | null> {
  return (await cookies()).get(PARENT_COOKIE)?.value ?? null;
}

/**
 * Where a main-site link into the shop should land. On one site (/shop) the login
 * cookie is shared, so it goes straight there. If the shop runs on another site:
 * signed in → the shop's /auth/continue with a one-time handoff code, so the
 * parent arrives signed in; signed out (or expired) → straight to the shop page.
 */
export async function storeDestination(
  to: string,
  locale: Locale,
  token: string | null,
): Promise<{ url: string; sessionExpired: boolean }> {
  const direct = withLang(to === "/" ? env.storeUrl : `${env.storeUrl}${to}`, locale);
  if (!token || storeIsSameSite()) return { url: direct, sessionExpired: false };
  try {
    const api = createClient({ baseUrl: env.apiUrl, token, locale, headers: await forwardedHeaders() });
    const { code } = await api.auth.parentHandoff();
    const url = new URL("/auth/continue", env.storeUrl);
    url.searchParams.set("code", code);
    url.searchParams.set("next", to);
    url.searchParams.set("lang", locale);
    return { url: url.toString(), sessionExpired: false };
  } catch (e) {
    return { url: direct, sessionExpired: e instanceof ApiError && (e.status === 401 || e.status === 403) };
  }
}
