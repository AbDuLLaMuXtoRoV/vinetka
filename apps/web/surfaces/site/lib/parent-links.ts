import type { Locale } from "@snapbell/sdk";

/**
 * Parent accounts on the main site. Safe to import from client components.
 *
 * Every main-site link into the shop goes through /go/store. On one site (/shop)
 * the login cookie is shared; if the shop runs on another site, /go/store hands
 * the session over with a one-time code.
 */

/** httpOnly session token (server only). */
export const PARENT_COOKIE = "sb_parent";
/** Display name for the header account menu; readable by the browser, never trusted for anything else. */
export const PARENT_NAME_COOKIE = "sb_parent_name";
/** Set for a couple of minutes after signing in so the next page can say "Welcome". */
export const WELCOME_COOKIE = "sb_welcome";

/** Only same-site shop paths, e.g. "/account" or "/a/SAMPLE". Anything else becomes "/". */
export function safeStorePath(value: unknown): string {
  if (typeof value !== "string" || value.length > 200) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return /^\/[A-Za-z0-9\-._~/?=&%#]*$/.test(value) ? value : "/";
}

/** Main-site link into the shop (relative): /go/store?to=/account&lang=ru. */
export function storeLink(locale: Locale, to: string): string {
  return `/go/store?to=${encodeURIComponent(safeStorePath(to))}&lang=${locale}`;
}

/** Reads the display-name cookie in the browser; null when signed out. */
export function readParentName(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${PARENT_NAME_COOKIE}=`))
    ?.slice(PARENT_NAME_COOKIE.length + 1);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw) || null;
  } catch {
    return raw;
  }
}
