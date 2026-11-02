import { INTL_LOCALE } from "@snapbell/sdk";
import { LocaleProvider } from "@snapbell/ui/locale";
import { ApiWarmup } from "@snapbell/ui/warmup";
import { ToastProvider } from "@snapbell/ui/toast";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { getLocale } from "@/lib/i18n";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Snapbell Admin", template: "%s · Snapbell Admin" },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={INTL_LOCALE[locale]} data-theme="light" className={`${inter.variable}`}>
      <body className="min-h-dvh bg-bg text-ink">
        <LocaleProvider locale={locale}>
          <ApiWarmup url={`${env.apiUrl}/health`} />
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
