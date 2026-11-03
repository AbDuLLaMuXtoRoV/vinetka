import { MARKETS, type Locale, type Market } from "@snapbell/sdk";
import { commonMsgs } from "@site/messages/common";
import { env } from "./env";
import { localePath, withLang } from "./i18n";

export const SITE_NAME = "Snapbell";

export type ProductNavKey = "check-in" | "family-store" | "marketing" | "markets";

export interface NavItem {
  href: string;
  label: string;
  description: string;
}

/** Product mega-menu, with localized hrefs. */
export function productNav(locale: Locale): Array<NavItem & { key: ProductNavKey }> {
  const t = commonMsgs[locale].productNav;
  return [
    { key: "check-in", href: localePath(locale, "/features/check-in"), ...t.checkIn },
    { key: "family-store", href: localePath(locale, "/features/family-store"), ...t.familyStore },
    { key: "marketing", href: localePath(locale, "/features/marketing"), ...t.marketing },
    { key: "markets", href: localePath(locale, "/markets"), ...t.markets },
  ];
}

export type ResourceKey = "blog" | "help" | "switch";

export function resourcesNav(locale: Locale): Array<NavItem & { key: ResourceKey }> {
  const t = commonMsgs[locale].resourcesNav;
  return [
    { key: "blog", href: localePath(locale, "/blog"), ...t.blog },
    { key: "help", href: localePath(locale, "/help"), ...t.help },
    { key: "switch", href: localePath(locale, "/switch"), ...t.switch },
  ];
}

/** Studios are created by the Snapbell team; partners log in to the Studio app here. */
export function studioLoginUrl(locale: Locale): string {
  return withLang(`${env.studioUrl}/login`, locale);
}

export function marketLabels(locale: Locale): Record<Market, string> {
  return commonMsgs[locale].markets;
}

export function footerColumns(locale: Locale): Array<{ title: string; links: Array<{ href: string; label: string }> }> {
  const t = commonMsgs[locale].footer;
  const p = (path: string) => localePath(locale, path);
  const labels = marketLabels(locale);
  return [
    {
      title: t.columns.product,
      links: [
        { href: p("/features"), label: t.links.allFeatures },
        { href: p("/features/check-in"), label: t.links.checkIn },
        { href: p("/features/family-store"), label: t.links.familyStore },
        { href: p("/features/marketing"), label: t.links.marketing },
        { href: p("/pricing"), label: t.links.pricing },
      ],
    },
    {
      title: t.columns.markets,
      links: MARKETS.map((m) => ({ href: p(`/markets#${m}`), label: labels[m] })),
    },
    {
      title: t.columns.resources,
      links: [
        { href: p("/blog"), label: t.links.blog },
        { href: p("/help"), label: t.links.help },
        { href: p("/switch"), label: t.links.switch },
        { href: p("/demo"), label: t.links.demo },
        { href: p("/find-my-photos"), label: t.links.findPhotos },
      ],
    },
    {
      title: t.columns.company,
      links: [
        { href: p("/about"), label: t.links.about },
        { href: p("/contact"), label: t.links.contact },
        { href: studioLoginUrl(locale), label: t.links.studioLogin },
      ],
    },
  ];
}

export const LEGAL_KEYS = ["terms", "terms-parents", "privacy", "biometrics", "cookies", "data-request"] as const;
export type LegalPath = (typeof LEGAL_KEYS)[number];

export function legalLinks(locale: Locale): Array<{ key: LegalPath; href: string; label: string }> {
  const t = commonMsgs[locale].footer.legal;
  const label: Record<LegalPath, string> = {
    terms: t.terms,
    "terms-parents": t.termsParents,
    privacy: t.privacy,
    biometrics: t.biometrics,
    cookies: t.cookies,
    "data-request": t.dataRequest,
  };
  return LEGAL_KEYS.map((key) => ({ key, href: localePath(locale, `/${key}`), label: label[key] }));
}

export const COMPANY = {
  legalName: "Snapbell, Inc.",
  email: "hello@snapbell.com",
  supportEmail: "support@snapbell.com",
  address: "2100 NW Raleigh St, Suite 300, Portland, OR 97210",
};
