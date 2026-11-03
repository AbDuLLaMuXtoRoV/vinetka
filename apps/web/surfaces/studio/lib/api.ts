import { ApiError, createClient, type Member, type Role, type SnapbellClient, type Studio } from "@snapbell/sdk";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { env } from "./env";
import { getLocale } from "./i18n";

export const SESSION_COOKIE = "sb_studio";

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

/** API client authenticated with the staff session cookie. Server-only. */
export async function api(): Promise<SnapbellClient> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  return createClient({ baseUrl: env.apiUrl, token, locale: await getLocale() });
}

export interface StaffContext {
  member: Member;
  studio: Studio;
}

/** Current staff member and studio; redirects to /login when the session is missing or expired. */
export const getSession = cache(async (): Promise<StaffContext> => {
  const client = await api();
  let me: Awaited<ReturnType<SnapbellClient["auth"]["me"]>> | null = null;
  try {
    me = await client.auth.me();
  } catch (e) {
    if (!(e instanceof ApiError && (e.status === 401 || e.status === 403))) throw e;
  }
  if (!me || me.kind !== "staff") redirect("/studio/login?expired=1");
  return { member: me.member, studio: me.studio };
});

/** Staff with payout/report access. Photographers cannot see payouts. */
export function canSeeMoney(role: Role): boolean {
  return role === "owner" || role === "admin";
}

export async function requireRole(roles: Role[]): Promise<StaffContext> {
  const session = await getSession();
  if (!roles.includes(session.member.role)) redirect("/studio/home?denied=1");
  return session;
}

/**
 * Run a read against the API from a server component: 401 → /login, 404 → not-found page.
 * Anything else (API down, 500) propagates to the nearest error.tsx.
 */
export async function load<T>(fn: (client: SnapbellClient) => Promise<T>): Promise<T> {
  const client = await api();
  let status = 0;
  try {
    return await fn(client);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    status = e.status;
    if (status !== 401 && status !== 404 && status !== 403) throw e;
  }
  if (status === 404) notFound();
  if (status === 403) redirect("/studio/home?denied=1");
  redirect("/studio/login?expired=1");
}
