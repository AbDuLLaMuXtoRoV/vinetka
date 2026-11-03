"use server";

import { ApiError, createClient, type AdminCreateStudioInput, type ContactRequestStatus, type FeatureFlag } from "@snapbell/sdk";
import { forwardedHeaders } from "./forwarded";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, act, adminCookieOptions } from "./api";
import { adminMsgs } from "@admin/messages/admin";
import { env } from "./env";
import { getLocale } from "./i18n";

export interface LoginState {
  error: string | null;
}

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const locale = await getLocale();
  const t = adminMsgs[locale].errors;
  if (!email || !password) return { error: t.missing };
  try {
    const res = await createClient({ baseUrl: env.apiUrl, locale, headers: await forwardedHeaders() }).admin.login({ email, password });
    (await cookies()).set(ADMIN_COOKIE, res.token, adminCookieOptions);
  } catch (e) {
    if (e instanceof ApiError) return { error: e.status === 401 || e.status === 400 ? t.wrong : e.message };
    return { error: t.unreachable };
  }
  redirect("/admin/requests");
}

export async function logoutAction() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function refundOrder(id: string, input: { amountCents?: number; reason: string }) {
  return act((c) => c.admin.refund(id, input), ["/admin/orders", `/admin/orders/${id}`]);
}

export async function retryLabSubmission(id: string) {
  return act((c) => c.admin.retryLabSubmission(id), ["/admin/lab-queue"]);
}

/** The only way a studio is created. Returns the owner's one-time setup link. */
export async function createStudioAction(input: AdminCreateStudioInput) {
  return act((c) => c.admin.createStudio(input), ["/admin/studios", "/admin/requests"]);
}

/** Fresh setup link for an owner who hasn't finished setup; the previous one stops working. */
export async function ownerSetupLinkAction(memberId: string) {
  return act((c) => c.admin.memberSetupLink(memberId), ["/admin/studios"]);
}

export async function updateContactRequestAction(id: string, patch: { status?: ContactRequestStatus; note?: string | null }) {
  return act((c) => c.admin.updateContactRequest(id, patch), ["/admin/requests"]);
}

export async function updateFlag(key: string, patch: Partial<Pick<FeatureFlag, "enabled" | "studioIds">>) {
  return act((c) => c.admin.updateFlag(key, patch), ["/admin/flags"]);
}
