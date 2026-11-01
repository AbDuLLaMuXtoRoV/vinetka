import { normalizeCode } from "@snapbell/sdk";
import type { Metadata } from "next";
import { CodeEntry } from "@/components/code-entry";
import { DemoNotice } from "@/components/demo-notice";
import { PublicTopBar } from "@/components/public-top-bar";
import { hasSession } from "@/lib/api";
import { authMsgs } from "@/messages/auth";
import Link from "next/link";
import { getLocale } from "@/lib/i18n";
import { metaMsgs } from "@/messages/meta";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].enterCode };
}

export default async function EnterCodePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initial = typeof sp.code === "string" ? normalizeCode(sp.code).slice(0, 6) : "";
  const locale = await getLocale();
  const a = authMsgs[locale];
  const signedIn = await hasSession();
  const link = "font-medium text-ink underline underline-offset-4 hover:no-underline";
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center px-4 pt-[env(safe-area-inset-top)] pb-12">
      <div className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-4">
        <PublicTopBar />
      </div>
      <CodeEntry initialCode={initial} />
      {!signedIn && (
        <p className="mt-6 text-center text-sm text-muted">
          {a.haveAccount}{" "}
          <Link href="/signin" className={link}>
            {a.signIn}
          </Link>
          {" · "}
          {a.newHere}{" "}
          <Link href="/signup" className={link}>
            {a.createAccount}
          </Link>
        </p>
      )}
      <DemoNotice locale={locale} />
    </main>
  );
}
