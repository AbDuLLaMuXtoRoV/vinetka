import { AsyncLocalStorage } from "node:async_hooks";
import { DEFAULT_LOCALE, isLocale, negotiateLocale, type Locale } from "@snapbell/sdk";
import type { NextFunction, Request, Response } from "express";

interface LocaleStore {
  /** Language for this request's responses (Accept-Language, default English). */
  locale: Locale;
  /** Set only when the caller asked for a supported language explicitly. */
  explicit: Locale | null;
}

const storage = new AsyncLocalStorage<LocaleStore>();

/** A supported language the header actually names, or null (missing header, only unsupported languages). */
export function explicitLocale(header: string | undefined | null): Locale | null {
  if (!header) return null;
  const negotiated = negotiateLocale(header);
  if (negotiated !== DEFAULT_LOCALE) return negotiated;
  return /(^|,)\s*en(\b|-)/i.test(header) ? DEFAULT_LOCALE : null;
}

export function resolveLocale(req: Pick<Request, "headers">): Locale {
  return negotiateLocale(req.headers["accept-language"]);
}

/**
 * Express middleware, registered before everything else: every handler, service
 * and timer started while serving the request sees the request's language.
 */
export function localeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers["accept-language"];
  storage.run({ locale: negotiateLocale(header), explicit: explicitLocale(header) }, () => next());
}

/** The current request's language; English outside a request (webhooks without a header, startup). */
export function currentLocale(): Locale {
  return storage.getStore()?.locale ?? DEFAULT_LOCALE;
}

export function requestedLocale(): Locale | null {
  return storage.getStore()?.explicit ?? null;
}

/** Run `fn` as if serving a request in `locale` (tests, background work for a known recipient). */
export function withLocale<T>(locale: Locale, fn: () => T): T {
  return storage.run({ locale: isLocale(locale) ? locale : DEFAULT_LOCALE, explicit: locale }, fn);
}
