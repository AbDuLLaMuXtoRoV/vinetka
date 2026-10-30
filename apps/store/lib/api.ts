import {
  ApiError,
  createClient,
  type AlbumAccessError,
  type Cart,
  type Locale,
  type SnapbellClient,
  type StudioBranding,
} from "@snapbell/sdk";
import { cookies } from "next/headers";
import { cache } from "react";
import { serverMsgs } from "@/messages/server";
import { env } from "./env";
import { forwardedHeaders } from "./forwarded";
import { getLocale } from "./i18n";

/** Server-only helpers. The browser never talks to the API except for signed image URLs. */

export const PARENT_COOKIE = "sb_parent";
export const CART_COOKIE = "sb_cart";
/** Last album opened; lets cart/checkout/account show the right studio branding. */
export const ALBUM_COOKIE = "sb_album";

export function cookieOptions(days: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 86_400,
  };
}

export async function api(): Promise<SnapbellClient> {
  const jar = await cookies();
  return createClient({
    baseUrl: env.apiUrl,
    token: jar.get(PARENT_COOKIE)?.value ?? null,
    headers: await forwardedHeaders(),
    // The API answers in the parent's language and remembers it for texts and emails.
    locale: await getLocale(),
  });
}

export type LoadError =
  | { kind: "unauthorized" }
  | { kind: "unavailable"; message: string }
  | {
      kind: "access";
      error: AlbumAccessError["error"];
      message: string;
      publishAt: string | null;
      studio: StudioBranding | null;
    }
  | { kind: "not_found"; message: string }
  | { kind: "other"; status: number; message: string };

export function toLoadError(e: unknown, locale: Locale = "en"): LoadError {
  if (e instanceof ApiError) {
    if (e.status === 401) return { kind: "unauthorized" };
    const code = e.code;
    if (code === "invalid_code" || code === "not_published" || code === "expired") {
      return { kind: "access", error: code, message: e.message, publishAt: e.body?.publishAt ?? null, studio: e.body?.studio ?? null };
    }
    if (e.status === 404) return { kind: "not_found", message: e.message };
    return { kind: "other", status: e.status, message: e.message };
  }
  return { kind: "unavailable", message: serverMsgs[locale].errors.unavailable };
}

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: LoadError };

export async function load<T>(fn: (client: SnapbellClient) => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await fn(await api()) };
  } catch (e) {
    return { ok: false, error: toLoadError(e, await getLocale()) };
  }
}

// Request-scoped caches so layouts and pages share one API call.
export const getAlbum = cache((code: string) => load((c) => c.store.album(code)));
export const getShop = cache((code: string) => load((c) => c.store.shop(code)));
export const getBranding = cache((code: string) => load((c) => c.store.branding(code)));

export const getCart = cache(async (): Promise<Cart | null> => {
  const jar = await cookies();
  const id = jar.get(CART_COOKIE)?.value;
  if (!id) return null;
  const res = await load((c) => c.carts.get(id));
  return res.ok ? res.data : null;
});

export async function hasSession(): Promise<boolean> {
  return Boolean((await cookies()).get(PARENT_COOKIE)?.value);
}

export async function lastAlbumCode(): Promise<string | null> {
  return (await cookies()).get(ALBUM_COOKIE)?.value ?? null;
}

export function cartCount(cart: Cart | null): number {
  return cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;
}

/** Only same-site relative paths: never an open redirect. */
export function safeNext(next: unknown): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}

/** API download URLs may be relative to the API origin. */
export function absoluteApiUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  const base = env.apiUrl.replace(/\/$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}
