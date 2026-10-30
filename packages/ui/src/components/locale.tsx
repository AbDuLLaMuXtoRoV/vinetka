"use client";

import { DEFAULT_LOCALE, INTL_LOCALE, LOCALE_COOKIE, LOCALE_LABELS, LOCALES, formatters, type Locale } from "@snapbell/sdk";
import { Globe } from "lucide-react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { uiMessages } from "../lib/messages";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Put once in each app's root layout with the locale resolved on the server. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Pick this locale's strings from a `defineMessages` module. */
export function useMessages<T>(messages: Record<Locale, T>): T {
  return messages[useLocale()];
}

/** Locale-aware money, dates, countdowns. */
export function useFormatters() {
  const locale = useLocale();
  return useMemo(() => formatters(locale), [locale]);
}

/**
 * Language picker. Stores the choice in the `sb_locale` cookie, then either
 * navigates to `hrefs[locale]` (marketing: /ru/…, /uz/…) or reloads the page
 * (store, studio, admin read the cookie on the server).
 * Pass `cookieDomain` (e.g. ".snapbell.com") to share the choice across subdomains.
 */
export function LanguageSwitcher({
  hrefs,
  cookieDomain,
  variant = "select",
  className,
}: {
  hrefs?: Partial<Record<Locale, string>>;
  cookieDomain?: string;
  variant?: "select" | "pills";
  className?: string;
}) {
  const current = useLocale();
  const t = uiMessages[current];

  const change = (next: Locale) => {
    if (next === current) return;
    const domain = cookieDomain ? `; domain=${cookieDomain}` : "";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax${domain}`;
    const href = hrefs?.[next];
    if (href) window.location.assign(href);
    else window.location.reload();
  };

  if (variant === "pills") {
    return (
      <div role="group" aria-label={t.language} className={cn("inline-flex rounded-input border border-border p-0.5", className)}>
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            lang={INTL_LOCALE[l]}
            aria-pressed={l === current}
            aria-label={LOCALE_LABELS[l].native}
            onClick={() => change(l)}
            className={cn(
              "min-h-9 min-w-10 rounded-[6px] px-2 text-xs font-semibold transition-colors duration-150",
              l === current ? "bg-ink text-bg" : "text-muted hover:text-ink",
            )}
          >
            {LOCALE_LABELS[l].short}
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">{t.language}</span>
      <Globe className="pointer-events-none absolute left-3 size-4 text-muted" aria-hidden />
      <select
        value={current}
        onChange={(e) => change(e.target.value as Locale)}
        className="h-11 cursor-pointer appearance-none rounded-input border border-border bg-surface pr-4 pl-9 text-sm text-ink hover:border-ink/30 focus-visible:border-ink focus-visible:outline-none"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={INTL_LOCALE[l]}>
            {LOCALE_LABELS[l].native}
          </option>
        ))}
      </select>
    </label>
  );
}
