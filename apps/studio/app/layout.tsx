import { INTL_LOCALE } from "@snapbell/sdk";
import { LocaleProvider } from "@snapbell/ui/locale";
import { ApiWarmup } from "@snapbell/ui/warmup";
import { ToastProvider } from "@snapbell/ui/toast";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { getLocale } from "@/lib/i18n";
import { commonMsgs } from "@/messages/common";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Snapbell Studio", template: "%s · Snapbell Studio" },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={INTL_LOCALE[locale]} data-theme="system" className={`${inter.variable}`}>
      <body className="min-h-dvh bg-bg text-ink">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-input focus:bg-ink focus:px-3 focus:py-2 focus:text-bg">
          {commonMsgs[locale].skipToContent}
        </a>
        <LocaleProvider locale={locale}>
          <ApiWarmup url={`${env.apiUrl}/health`} />
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
