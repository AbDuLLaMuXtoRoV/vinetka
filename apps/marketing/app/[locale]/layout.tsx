import { LocaleProvider } from "@snapbell/ui/locale";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Lora } from "next/font/google";
import "../globals.css";
import { CtaBand } from "@/components/cta-band";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { env } from "@/lib/env";
import { OG_LOCALE, getLocale, htmlLang, localeParams } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";
import { commonMsgs } from "@/messages/common";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["SOFT", "opsz"] });
/** Fraunces has no Cyrillic; the display font stack falls back to Lora glyph by glyph. */
const lora = Lora({ subsets: ["latin", "cyrillic"], variable: "--font-display-cyrillic", display: "swap" });

export const generateStaticParams = localeParams;

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await getLocale(params);
  const t = commonMsgs[locale];
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: t.defaultTitle, template: `%s · ${SITE_NAME}` },
    description: t.siteDescription,
    applicationName: SITE_NAME,
    openGraph: { type: "website", siteName: SITE_NAME, locale: OG_LOCALE[locale] },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await getLocale(params);
  const t = commonMsgs[locale];
  return (
    <html lang={htmlLang(locale)} data-theme="light" className={`${inter.variable} ${fraunces.variable} ${lora.variable}`}>
      <body className="min-h-dvh bg-bg text-ink">
        <LocaleProvider locale={locale}>
          <a
            href="#main"
            className="fixed top-2 left-2 z-50 -translate-y-20 rounded-input bg-ink px-4 py-3 text-sm font-medium text-bg transition-transform focus:translate-y-0"
          >
            {t.skipToContent}
          </a>
          <SiteHeader locale={locale} />
          <main id="main" tabIndex={-1} className="focus:outline-none">
            {children}
          </main>
          <CtaBand locale={locale} />
          <SiteFooter locale={locale} />
        </LocaleProvider>
      </body>
    </html>
  );
}
