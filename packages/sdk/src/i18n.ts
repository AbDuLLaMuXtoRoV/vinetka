import type { Cents } from "./types";

/**
 * Languages: English (source), Russian, Uzbek (Latin script).
 *
 * Translations live next to the code that uses them as `defineMessages(en, { ru, uz })`
 * modules, so each screen only ships its own strings and TypeScript enforces that
 * every language has every key. Messages that depend on a number are functions
 * that call `plural()`.
 */
export type Locale = "en" | "ru" | "uz";

export const LOCALES: readonly Locale[] = ["en", "ru", "uz"];
export const DEFAULT_LOCALE: Locale = "en";
/** Preference cookie (not httpOnly: the language switcher sets it in the browser). */
export const LOCALE_COOKIE = "sb_locale";

export const LOCALE_LABELS: Record<Locale, { native: string; english: string; short: string }> = {
  en: { native: "English", english: "English", short: "EN" },
  ru: { native: "Русский", english: "Russian", short: "RU" },
  uz: { native: "Oʻzbekcha", english: "Uzbek", short: "UZ" },
};

/** BCP 47 tags for Intl and <html lang>. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-US", ru: "ru-RU", uz: "uz-Latn-UZ" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Best supported language from an Accept-Language header ("ru-RU,ru;q=0.9,en;q=0.8" → "ru"). */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.toLowerCase().split("-")[0] ?? "", q: q ? Number(q.slice(2)) || 0 : 1 };
    })
    .filter((x) => x.lang && x.q > 0)
    .sort((a, b) => b.q - a.q);
  const match = ranked.find((x) => isLocale(x.lang));
  return match ? (match.lang as Locale) : DEFAULT_LOCALE;
}

/** Strings for a translation module: the English shape is the contract for the others. */
export function defineMessages<T>(en: T, translations: { ru: NoInfer<T>; uz: NoInfer<T> }): Record<Locale, T> {
  return { en, ru: translations.ru, uz: translations.uz };
}

export interface PluralForms {
  /** 1 (and 21, 31… in Russian) */
  one: string;
  /** 2–4, 22–24… (Russian) */
  few?: string;
  /** 5–20, 25–30… (Russian) */
  many?: string;
  other: string;
}

/** Picks the plural form for `n`; "#" in the form is replaced with the formatted number. */
export function plural(locale: Locale, n: number, forms: PluralForms): string {
  const rule = pluralRules(locale).select(n) as keyof PluralForms;
  const form = forms[rule] ?? forms.other;
  return form.replace(/#/g, numberFormat(locale).format(n));
}

const cache = new Map<string, unknown>();
function memo<T>(key: string, make: () => T): T {
  let v = cache.get(key) as T | undefined;
  if (v === undefined) {
    v = make();
    cache.set(key, v);
  }
  return v;
}
const pluralRules = (l: Locale) => memo(`pr:${l}`, () => new Intl.PluralRules(INTL_LOCALE[l]));
const numberFormat = (l: Locale) => memo(`nf:${l}`, () => new Intl.NumberFormat(INTL_LOCALE[l]));

const DAY = 86_400_000;

const COUNTDOWN = {
  en: {
    closed: "Ordering closed",
    withinHour: "Closes within the hour",
    hours: (n: number) => plural("en", n, { one: "# hour left", other: "# hours left" }),
    days: (n: number) => plural("en", n, { one: "# day left", other: "# days left" }),
  },
  ru: {
    closed: "Приём заказов закрыт",
    withinHour: "Закроется в течение часа",
    hours: (n: number) => plural("ru", n, { one: "Остался # час", few: "Осталось # часа", many: "Осталось # часов", other: "Осталось # часа" }),
    days: (n: number) => plural("ru", n, { one: "Остался # день", few: "Осталось # дня", many: "Осталось # дней", other: "Осталось # дня" }),
  },
  uz: {
    closed: "Buyurtma qabul qilish yopildi",
    withinHour: "Bir soat ichida yopiladi",
    hours: (n: number) => `${numberFormat("uz").format(n)} soat qoldi`,
    days: (n: number) => `${numberFormat("uz").format(n)} kun qoldi`,
  },
} satisfies Record<Locale, unknown>;

export interface Countdown {
  label: string;
  days: number;
  hours: number;
  /** Less than two days left. */
  urgent: boolean;
  closed: boolean;
}

/** Locale-aware formatting. Money stays in USD for now (multi-currency is a v3 item). */
export function formatters(locale: Locale) {
  const tag = INTL_LOCALE[locale];
  return memo(`fmt:${locale}`, () => {
    const money = (whole: boolean) =>
      new Intl.NumberFormat(tag, { style: "currency", currency: "USD", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
    const moneyCents = money(false);
    const moneyWhole = money(true);
    const dateShort = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", year: "numeric" });
    const dateTime = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
    const pct = (digits: number) => new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: digits });

    return {
      locale,
      money: (cents: Cents, opts: { whole?: boolean } = {}) => (opts.whole ? moneyWhole : moneyCents).format(cents / 100),
      number: (n: number) => numberFormat(locale).format(n),
      percent: (fraction: number, digits = 0) => pct(digits).format(fraction),
      date: (iso: string | Date, opts?: Intl.DateTimeFormatOptions) =>
        (opts ? new Intl.DateTimeFormat(tag, opts) : dateShort).format(new Date(iso)),
      dateTime: (iso: string | Date) => dateTime.format(new Date(iso)),
      /** "in 3 days", "через 3 дня", "3 kundan keyin". */
      relative: (iso: string | Date, now: Date = new Date()) => {
        const diff = new Date(iso).getTime() - now.getTime();
        const abs = Math.abs(diff);
        if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
        if (abs < DAY) return rtf.format(Math.round(diff / 3_600_000), "hour");
        if (abs < 30 * DAY) return rtf.format(Math.round(diff / DAY), "day");
        return rtf.format(Math.round(diff / (30 * DAY)), "month");
      },
      /** Deadline countdown for album headers and job cards. */
      countdown: (deadline: string | Date | null, now: Date = new Date()): Countdown | null => {
        if (!deadline) return null;
        const t = COUNTDOWN[locale];
        const ms = new Date(deadline).getTime() - now.getTime();
        if (ms <= 0) return { label: t.closed, days: 0, hours: 0, urgent: false, closed: true };
        const days = Math.floor(ms / DAY);
        const hours = Math.floor((ms % DAY) / 3_600_000);
        const label = days === 0 ? (hours <= 1 ? t.withinHour : t.hours(hours)) : t.days(days);
        return { label, days, hours, urgent: days < 2, closed: false };
      },
    };
  });
}

export type Formatters = ReturnType<typeof formatters>;
