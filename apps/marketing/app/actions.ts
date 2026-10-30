"use server";

import { ApiError, INTL_LOCALE, createClient, isCodeFormat, isLocale, normalizeCode, type Locale } from "@snapbell/sdk";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { forwardedHeaders } from "@/lib/forwarded";
import { withLang } from "@/lib/i18n";
import { formMsgs } from "@/messages/forms";

export interface FormState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  /** Set when the client should navigate after tracking an analytics event. */
  redirectTo?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Every form posts its page's locale as a hidden field, so messages come back in that language. */
function formLocale(form: FormData): Locale {
  const v = text(form, "locale");
  return isLocale(v) ? v : "en";
}

function requireFields(form: FormData, locale: Locale, fields: Record<string, string>): Record<string, string> {
  const t = formMsgs[locale].validation;
  const errors: Record<string, string> = {};
  for (const [key, label] of Object.entries(fields)) {
    if (!text(form, key)) errors[key] = t.required(label);
  }
  if (fields.email && text(form, "email") && !EMAIL.test(text(form, "email"))) {
    errors.email = t.email;
  }
  return errors;
}

/**
 * Lead capture. Until the CRM integration exists these are logged on the
 * server so nothing is lost in development; swap in HubSpot/Postmark here.
 */
function recordLead(kind: string, form: FormData) {
  const data = Object.fromEntries([...form.entries()].filter(([k]) => !k.startsWith("$")));
  console.info(`[lead:${kind}]`, JSON.stringify(data));
}

export async function subscribeNewsletter(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const t = formMsgs[locale];
  if (!EMAIL.test(text(form, "email"))) {
    return { status: "error", errors: { email: t.validation.emailShort } };
  }
  recordLead("newsletter", form);
  return { status: "success", message: t.results.newsletter };
}

export async function sendContact(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const t = formMsgs[locale];
  const errors = requireFields(form, locale, { name: t.fields.name, email: t.fields.email, message: t.fields.howHelp });
  if (Object.keys(errors).length) return { status: "error", errors };
  recordLead("contact", form);
  return { status: "success", message: t.results.contact };
}

export async function requestDemo(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const t = formMsgs[locale];
  const errors = requireFields(form, locale, {
    name: t.fields.yourName,
    studio: t.fields.studioName,
    email: t.fields.workEmail,
    market: t.fields.mainMarket,
    volume: t.fields.yearlyVolume,
  });
  if (!text(form, "slot") && !process.env.NEXT_PUBLIC_CALCOM_URL) errors.slot = t.validation.slot;
  if (Object.keys(errors).length) return { status: "error", errors };
  recordLead("demo", form);
  const slot = text(form, "slot");
  const when = slot
    ? new Date(slot).toLocaleString(INTL_LOCALE[locale], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })
    : null;
  return { status: "success", message: when ? t.results.demoBooked(when) : t.results.demoCalendar };
}

export async function requestMigration(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const t = formMsgs[locale];
  const errors = requireFields(form, locale, { name: t.fields.name, email: t.fields.email, studio: t.fields.studioName, current: t.fields.currentShort });
  if (Object.keys(errors).length) return { status: "error", errors };
  recordLead("switch", form);
  return { status: "success", message: t.results.migration };
}

export async function submitDataRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const t = formMsgs[locale];
  const errors = requireFields(form, locale, { name: t.fields.yourName, email: t.fields.emailOnFile, type: t.fields.requestTypeShort });
  if (Object.keys(errors).length) return { status: "error", errors };
  recordLead("data-request", form);
  return { status: "success", message: t.results.dataRequest };
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const t = formMsgs[locale];
  const errors = requireFields(form, locale, { name: t.fields.yourName, studioName: t.fields.studioName, email: t.fields.workEmail, password: t.fields.password });
  const password = text(form, "password");
  if (password && password.length < 8) errors.password = t.validation.password;
  if (Object.keys(errors).length) return { status: "error", errors };

  try {
    const api = createClient({ baseUrl: env.apiUrl, headers: await forwardedHeaders(), locale });
    const { handoffCode } = await api.auth.signup({
      name: text(form, "name"),
      studioName: text(form, "studioName"),
      email: text(form, "email"),
      password,
    });
    return {
      status: "success",
      message: t.results.signupReady,
      redirectTo: withLang(`${env.studioUrl}/auth/handoff?code=${encodeURIComponent(handoffCode)}`, locale),
    };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) return { status: "error", errors: { email: t.results.emailExists } };
      if (err.status === 400) return { status: "error", message: err.message };
      if (err.status === 429) return { status: "error", message: t.results.tooMany };
      return { status: "error", message: err.message || t.results.generic };
    }
    return { status: "error", message: t.results.unreachable };
  }
}

export async function findPhotos(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const code = normalizeCode(text(form, "code"));
  if (!isCodeFormat(code)) {
    return { status: "error", errors: { code: formMsgs[locale].validation.code } };
  }
  redirect(withLang(`${env.storeUrl}/a/${code}`, locale));
}
