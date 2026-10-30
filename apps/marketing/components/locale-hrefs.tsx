"use client";

import { LOCALES, type Locale } from "@snapbell/sdk";
import { LanguageSwitcher } from "@snapbell/ui/locale";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { localePath, splitLocale } from "@/lib/i18n";

/** The current page in every language (keeps the #hash, e.g. /ru/markets#sports). */
export function useLocaleHrefs(): Record<Locale, string> {
  const { path } = splitLocale(usePathname());
  const [hash, setHash] = useState("");
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return Object.fromEntries(LOCALES.map((l) => [l, `${localePath(l, path)}${hash}`])) as Record<Locale, string>;
}

/** Footer language picker: goes to the same page in the chosen language. */
export function FooterLanguageSwitcher() {
  return <LanguageSwitcher hrefs={useLocaleHrefs()} className="w-44" />;
}
