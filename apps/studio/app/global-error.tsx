"use client";

import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@snapbell/sdk";
import { commonMsgs } from "@/messages/common";

/** Replaces the root layout, so the locale comes from the cookie or the browser. */
function clientLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const fromCookie = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`))?.[1];
  if (isLocale(fromCookie)) return fromCookie;
  const lang = navigator.language.slice(0, 2);
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
}

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const locale = clientLocale();
  const t = commonMsgs[locale].globalError;
  return (
    <html lang={INTL_LOCALE[locale]}>
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: 16 }}>
          <h1 style={{ fontSize: 24 }}>{t.title}</h1>
          <p style={{ color: "#6b6770" }}>{t.description}</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 16px", borderRadius: 8, border: 0, background: "#f5b700", fontWeight: 600 }}>
            {t.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
