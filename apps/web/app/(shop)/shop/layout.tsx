import { INTL_LOCALE } from "@snapbell/sdk";
import { LocaleProvider } from "@snapbell/ui/locale";
import { ApiWarmup } from "@snapbell/ui/warmup";
import { ToastProvider } from "@snapbell/ui/toast";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { getLocale } from "@shop/lib/i18n";
import { metaMsgs } from "@shop/messages/meta";
import { env } from "@shop/lib/env";
import "../../globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-inter", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const t = metaMsgs[await getLocale()];
  return {
    title: { default: t.title, template: `%s · ${t.title}` },
    description: t.description,
    applicationName: "Snapbell Photos",
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: t.appTitle, statusBarStyle: "default" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#141316" },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={INTL_LOCALE[locale]} data-theme="system" className={inter.variable}>
      <body className="min-h-dvh bg-bg text-ink">
        <LocaleProvider locale={locale}>
          <ApiWarmup url={`${env.publicApiUrl}/health`} />
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
