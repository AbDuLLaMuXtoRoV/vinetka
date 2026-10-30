import { ApiError, createClient, type SnapbellClient } from "@snapbell/sdk";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { adminMsgs } from "@/messages/admin";
import { env } from "./env";
import { getLocale } from "./i18n";

export const ADMIN_COOKIE = "sb_admin";

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};

export async function api(): Promise<SnapbellClient> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value ?? null;
  return createClient({ baseUrl: env.apiUrl, token, locale: await getLocale() });
}

/** Signed-in internal admin; redirects to /login otherwise. */
export const getAdmin = cache(async (): Promise<{ email: string }> => {
  let me: Awaited<ReturnType<SnapbellClient["auth"]["me"]>> | null = null;
  try {
    me = await (await api()).auth.me();
  } catch (e) {
    if (!(e instanceof ApiError && (e.status === 401 || e.status === 403))) throw e;
  }
  if (!me || me.kind !== "admin") redirect("/login?expired=1");
  return { email: me.email };
});

/** Read for server components: 401 → /login, 404 → not found. */
export async function load<T>(fn: (client: SnapbellClient) => Promise<T>): Promise<T> {
  const client = await api();
  let status = 0;
  try {
    return await fn(client);
  } catch (e) {
    if (!(e instanceof ApiError) || (e.status !== 401 && e.status !== 403 && e.status !== 404)) throw e;
    status = e.status;
  }
  if (status === 404) notFound();
  redirect("/login?expired=1");
}

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

export async function act<T>(fn: (client: SnapbellClient) => Promise<T>, revalidate: string[] = []): Promise<ActionResult<T>> {
  try {
    const data = await fn(await api());
    for (const p of revalidate) revalidatePath(p);
    return { ok: true, data };
  } catch (e) {
    const t = adminMsgs[await getLocale()].errors;
    if (e instanceof ApiError) return { ok: false, error: e.status === 401 ? t.session : e.message };
    return { ok: false, error: t.unreachable };
  }
}
