"use server";

import { ApiError, createClient, isLocale, toE164, type Locale, type MessageChannel } from "@snapbell/sdk";
import { env } from "@site/lib/env";
import { forwardedHeaders } from "@site/lib/forwarded";
import { localePath } from "@site/lib/i18n";
import { clearParentSession, displayName, setParentSession } from "@site/lib/parent-session";
import { accountMsgs } from "@site/messages/account";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type SendCodeResult =
  | { ok: true; destination: string; devCode: string | null; resendAfterSec: number }
  | { ok: false; message: string };

export type VerifyCodeResult = { ok: true; redirectTo: string } | { ok: false; message: string };

function localeOf(value: unknown): Locale {
  return isLocale(value) ? value : "en";
}

async function api(locale: Locale, token?: string) {
  return createClient({ baseUrl: env.apiUrl, locale, token, headers: await forwardedHeaders() });
}

function failure(e: unknown, locale: Locale): { ok: false; message: string } {
  return { ok: false, message: e instanceof ApiError ? e.message : accountMsgs[locale].errors.unreachable };
}

/** Main-site paths only (open-redirect safe); the shop is reached through /go/store. */
function sitePath(next: unknown): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}

/** Step 1: text or email a one-time code. National phone numbers are Uzbek (+998). */
export async function sendParentCode(input: { locale: string; channel: MessageChannel; destination: string }): Promise<SendCodeResult> {
  const locale = localeOf(input.locale);
  const t = accountMsgs[locale].errors;
  const destination = input.channel === "sms" ? toE164(input.destination) : EMAIL.test(input.destination.trim()) ? input.destination.trim() : null;
  if (!destination) return { ok: false, message: input.channel === "sms" ? t.badPhone : t.badEmail };
  try {
    const res = await (await api(locale)).auth.sendOtp({ destination, channel: input.channel });
    return { ok: true, destination: res.destination || destination, devCode: res.devCode, resendAfterSec: res.resendAfterSec || 30 };
  } catch (e) {
    return failure(e, locale);
  }
}

/**
 * Step 2: check the code, then keep the parent signed in on the main site.
 * The parent stays here; the shop is one click away in the account menu.
 */
export async function verifyParentCode(input: {
  locale: string;
  destination: string;
  code: string;
  /** Sign-up only. */
  name?: string;
  /** Sign-up only; plain sign-in keeps the parent's stored choices. */
  consent?: { smsUpdates: boolean; marketing: boolean };
  next?: string;
}): Promise<VerifyCodeResult> {
  const locale = localeOf(input.locale);
  const t = accountMsgs[locale].errors;
  if (!/^\d{6}$/.test(input.code)) return { ok: false, message: t.badCode };
  const name = input.name?.trim().slice(0, 100) || undefined;
  try {
    const session = await (await api(locale)).auth.verifyOtp({
      destination: input.destination,
      code: input.code,
      consent: input.consent,
      name,
    });
    let parent = session.parent;
    // Older APIs ignore `name` on verify: save it explicitly.
    if (name && !parent.name) {
      parent = await (await api(locale, session.token)).account.update({ name }).catch(() => ({ ...parent, name }));
    }
    await setParentSession(session.token, displayName(parent));
    return { ok: true, redirectTo: sitePath(input.next) ?? localePath(locale, "/") };
  } catch (e) {
    return failure(e, locale);
  }
}

export async function signOutParent(): Promise<void> {
  await clearParentSession();
}
