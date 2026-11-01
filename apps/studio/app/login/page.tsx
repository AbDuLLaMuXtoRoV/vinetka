import { LanguageSwitcher } from "@snapbell/ui/locale";
import type { Metadata } from "next";
import { env } from "@/lib/env";
import { getLocale } from "@/lib/i18n";
import { authMsgs } from "@/messages/auth";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: authMsgs[await getLocale()].metaTitle };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const { next, expired } = await searchParams;
  const locale = await getLocale();
  const t = authMsgs[locale];
  // Studios are created by Snapbell; prospective studios reach us through the marketing contact page.
  const contactUrl = `${env.siteUrl.replace(/\/$/, "")}${locale === "en" ? "" : `/${locale}`}/contact`;
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);
  const showDemoCredentials = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NODE_ENV !== "production";
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="grid w-full max-w-sm gap-8">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="grid gap-2 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-card bg-accent text-lg font-bold text-accent-ink" aria-hidden>
            S
          </span>
          <h1 className="text-xl font-semibold">{t.title}</h1>
          <p className="text-sm text-muted">{t.subtitle}</p>
        </div>
        <LoginForm next={next ?? ""} expired={expired === "1"} googleConfigured={googleConfigured} />
        <p className="text-center text-sm text-muted">
          {t.sellQuestion}{" "}
          <a href={contactUrl} className="font-medium text-ink underline underline-offset-4 hover:no-underline">
            {t.contactUs}
          </a>
        </p>
        {showDemoCredentials && <p className="rounded-input bg-accent/15 p-3 text-center text-sm">{t.demoLogin}</p>}
      </div>
    </main>
  );
}
