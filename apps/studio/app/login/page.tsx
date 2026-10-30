import { LanguageSwitcher } from "@snapbell/ui/locale";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { authMsgs } from "@/messages/auth";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: authMsgs[await getLocale()].metaTitle };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const { next, expired } = await searchParams;
  const t = authMsgs[await getLocale()];
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);
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
      </div>
    </main>
  );
}
