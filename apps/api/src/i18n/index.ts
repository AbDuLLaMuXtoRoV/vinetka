import { formatters, type Locale } from "@snapbell/sdk";
import { currentLocale } from "./context";
import { errorMessages } from "./errors";
import { labelMessages } from "./labels";
import { notificationMessages } from "./notifications";

export { currentLocale, explicitLocale, localeMiddleware, requestedLocale, resolveLocale, withLocale } from "./context";
export { errorMessages } from "./errors";
export { labelMessages } from "./labels";
export { notificationMessages } from "./notifications";
export { v, validationMessages, zodErrorMap, issueSummary } from "./validation";

/** Error messages in the current request's language. */
export const err = () => errorMessages[currentLocale()];

/** Data labels in the current request's language. */
export const labels = () => labelMessages[currentLocale()];

/** Texts and emails in the recipient's language. */
export const notices = (locale: Locale = currentLocale()) => notificationMessages[locale];

/** Money, dates and countdowns in the given (default: current request's) language. */
export const fmt = (locale: Locale = currentLocale()) => formatters(locale);
