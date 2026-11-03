"use server";

import {
  ApiError,
  INTL_LOCALE,
  MARKETS,
  createClient,
  isCodeFormat,
  isLocale,
  normalizeCode,
  toE164,
  type ContactRequestInput,
  type ContactRequestKind,
  type Locale,
  type Market,
} from "@snapbell/sdk";
import { redirect } from "next/navigation";
import { env } from "@site/lib/env";
import { forwardedHeaders } from "@site/lib/forwarded";
import { clearParentSession, parentToken, storeDestination } from "@site/lib/parent-session";
import { formMsgs } from "@site/messages/forms";

export interface FormState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  /** Set when the client should navigate after tracking an analytics event. */
  redirectTo?: string;
  /** Contact request kind that was sent (analytics: contact_submitted). */
  kind?: ContactRequestKind;
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

/** Optional phone field → E.164 (national numbers are Uzbek). Records an error when it can't be read. */
function phoneValue(form: FormData, locale: Locale, errors: Record<string, string>, key = "phone"): string | null {
  const raw = text(form, key);
  if (!raw) return null;
  const e164 = toE164(raw);
  if (!e164) errors[key] = formMsgs[locale].validation.phone;
  return e164;
}

/** Bots fill every field, people never see this one. */
function isBot(form: FormData): boolean {
  return text(form, "website") !== "";
}

/**
 * Sends the request to the API, where the Snapbell team sees it in Admin → Requests.
 * Returns an error state, or null on success.
 */
async function sendRequest(locale: Locale, input: ContactRequestInput): Promise<FormState | null> {
  const t = formMsgs[locale].results;
  try {
    const api = createClient({ baseUrl: env.apiUrl, locale, headers: await forwardedHeaders() });
    await api.contact.submit(input);
    return null;
  } catch (err) {
    if (err instanceof ApiError) {
      // The API answers in the visitor's language (Accept-Language).
      if (err.status === 429) return { status: "error", message: err.message || t.tooMany };
      return { status: "error", message: err.message || t.generic };
    }
    return { status: "error", message: t.unreachable };
  }
}

/** Newsletter sign-ups stay local until an email provider is connected. */
export async function subscribeNewsletter(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const t = formMsgs[locale];
  if (!EMAIL.test(text(form, "email"))) {
    return { status: "error", errors: { email: t.validation.emailShort } };
  }
  console.info("[lead:newsletter]", text(form, "email"));
  return { status: "success", message: t.results.newsletter };
}

/** /contact: photographers asking to become partners, plus general questions. */
export async function submitPartnerRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const t = formMsgs[locale];
  const role = text(form, "role");
  const kind: ContactRequestKind = role === "photographer" || role === "studio" ? "partner" : "contact";
  if (isBot(form)) return { status: "success", message: t.results.partner, kind };

  const errors = requireFields(form, locale, { name: t.fields.yourName, role: t.fields.iAm, message: t.fields.aboutStudio });
  const email = text(form, "email");
  if (email && !EMAIL.test(email)) errors.email = t.validation.email;
  const phone = phoneValue(form, locale, errors);
  if (!email && !text(form, "phone")) errors.email = t.validation.emailOrPhone;
  if (Object.keys(errors).length) return { status: "error", errors };

  const markets = form.getAll("markets").filter((m): m is Market => typeof m === "string" && (MARKETS as string[]).includes(m));
  const failed = await sendRequest(locale, {
    kind,
    name: text(form, "name"),
    company: text(form, "company") || null,
    email: email || null,
    phone,
    city: text(form, "city") || null,
    message: text(form, "message"),
    details: { role, ...(markets.length ? { markets: markets.join(",") } : {}) },
  });
  return failed ?? { status: "success", message: kind === "partner" ? t.results.partner : t.results.contact, kind };
}

/** /about contact form. */
export async function sendContact(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const t = formMsgs[locale];
  if (isBot(form)) return { status: "success", message: t.results.contact, kind: "contact" };
  const errors = requireFields(form, locale, { name: t.fields.name, email: t.fields.email, message: t.fields.howHelp });
  if (Object.keys(errors).length) return { status: "error", errors };
  const failed = await sendRequest(locale, {
    kind: "contact",
    name: text(form, "name"),
    company: text(form, "studio") || null,
    email: text(form, "email"),
    message: text(form, "message"),
  });
  return failed ?? { status: "success", message: t.results.contact, kind: "contact" };
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
  const phone = phoneValue(form, locale, errors);
  if (Object.keys(errors).length) return { status: "error", errors };

  const slot = text(form, "slot");
  const when = slot
    ? new Date(slot).toLocaleString(INTL_LOCALE[locale], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })
    : null;
  if (isBot(form)) return { status: "success", message: when ? t.results.demoBooked(when) : t.results.demoCalendar, kind: "demo" };

  const failed = await sendRequest(locale, {
    kind: "demo",
    name: text(form, "name"),
    company: text(form, "studio"),
    email: text(form, "email"),
    phone,
    // Readable in Admin in the visitor's language; the raw values are in details.
    message: [`${t.fields.mainMarket}: ${text(form, "market")}`, `${t.fields.yearlyVolume}: ${text(form, "volume")}`, when ?? ""]
      .filter(Boolean)
      .join("\n"),
    details: { market: text(form, "market"), volume: text(form, "volume"), ...(slot ? { slot } : {}) },
  });
  return failed ?? { status: "success", message: when ? t.results.demoBooked(when) : t.results.demoCalendar, kind: "demo" };
}

export async function requestMigration(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const t = formMsgs[locale];
  if (isBot(form)) return { status: "success", message: t.results.migration, kind: "switch" };
  const errors = requireFields(form, locale, { name: t.fields.name, email: t.fields.email, studio: t.fields.studioName, current: t.fields.currentShort });
  if (Object.keys(errors).length) return { status: "error", errors };
  const current = text(form, "current");
  const options = t.switch.options;
  const currentLabel = { paper: options.paper, platform: options.platform, "own-site": options.ownSite, new: options.new }[current] ?? current;
  const jobs = text(form, "jobs");
  const failed = await sendRequest(locale, {
    kind: "switch",
    name: text(form, "name"),
    company: text(form, "studio"),
    email: text(form, "email"),
    message: [`${t.fields.current} ${currentLabel}`, jobs ? `${t.fields.jobsPerYear}: ${jobs}` : ""].filter(Boolean).join("\n"),
    details: { current, ...(jobs ? { jobsPerYear: jobs } : {}) },
  });
  return failed ?? { status: "success", message: t.results.migration, kind: "switch" };
}

export async function submitDataRequest(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const t = formMsgs[locale];
  if (isBot(form)) return { status: "success", message: t.results.dataRequest, kind: "data_request" };
  const errors = requireFields(form, locale, { name: t.fields.yourName, email: t.fields.emailOnFile, type: t.fields.requestTypeShort });
  const phone = phoneValue(form, locale, errors);
  if (Object.keys(errors).length) return { status: "error", errors };
  const type = text(form, "type");
  const options = t.dataRequest.options;
  const typeLabel = { access: options.access, correct: options.correct, delete: options.delete, biometrics: options.biometrics }[type] ?? type;
  const child = text(form, "child");
  const failed = await sendRequest(locale, {
    kind: "data_request",
    name: text(form, "name"),
    email: text(form, "email"),
    phone,
    message: [typeLabel, child, text(form, "details")].filter(Boolean).join("\n"),
    details: { type, ...(child ? { child } : {}) },
  });
  return failed ?? { status: "success", message: t.results.dataRequest, kind: "data_request" };
}

export async function findPhotos(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = formLocale(form);
  const code = normalizeCode(text(form, "code"));
  if (!isCodeFormat(code)) {
    return { status: "error", errors: { code: formMsgs[locale].validation.code } };
  }
  // Signed-in parents arrive in the shop signed in (one-time handoff); others go straight there.
  const { url, sessionExpired } = await storeDestination(`/a/${code}`, locale, await parentToken());
  if (sessionExpired) await clearParentSession();
  redirect(url);
}
