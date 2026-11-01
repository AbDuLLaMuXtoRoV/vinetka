import { ApiError, createClient, formatters, type AccountSetupInfo } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Alert } from "@snapbell/ui/feedback";
import { LanguageSwitcher } from "@snapbell/ui/locale";
import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";
import { forwardedHeaders } from "@/lib/forwarded";
import { getLocale } from "@/lib/i18n";
import { getLabels } from "@/lib/labels";
import { setupMsgs } from "@/messages/setup";
import { SetupForm } from "./setup-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: setupMsgs[await getLocale()].metaTitle };
}

type Lookup = { ok: true; info: AccountSetupInfo } | { ok: false; reason: "invalid" | "expired" | "missing" | "unreachable" };

async function lookup(token: string): Promise<Lookup> {
  if (!token) return { ok: false, reason: "missing" };
  try {
    const client = createClient({ baseUrl: env.apiUrl, locale: await getLocale(), headers: await forwardedHeaders() });
    return { ok: true, info: await client.auth.setupInfo(token) };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, reason: e.status === 410 || e.code === "setup_link_expired" ? "expired" : "invalid" };
    return { ok: false, reason: "unreachable" };
  }
}

/** One-time link for a new studio owner (created in Admin) or an invited team member. */
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const locale = await getLocale();
  const t = setupMsgs[locale];
  const result = await lookup(token);

  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="grid w-full max-w-sm gap-8">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="grid justify-items-center gap-2 text-center">
          <span className="grid size-11 place-items-center rounded-card bg-accent text-lg font-bold text-accent-ink" aria-hidden>
            S
          </span>
          {result.ok && (
            <>
              <h1 className="text-xl font-semibold">{t.welcome(result.info.name)}</h1>
              <p className="text-sm text-muted">{t.joining(result.info.studioName, getLabels(locale).roles[result.info.role])}</p>
            </>
          )}
        </div>

        {result.ok ? (
          <div className="grid gap-4 rounded-card border border-border bg-surface p-6">
            <SetupForm token={token} email={result.info.email} />
            <p className="text-center text-xs text-muted">{t.validUntil(formatters(locale).date(result.info.expiresAt))}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <Alert tone={result.reason === "unreachable" ? "danger" : "warning"} title={result.reason === "expired" ? t.expiredTitle : t.invalidTitle}>
              {result.reason === "expired" ? t.expiredBody : result.reason === "missing" ? t.noToken : result.reason === "unreachable" ? t.errors.unreachable : t.invalidBody}{" "}
              {result.reason !== "unreachable" && t.askOwner}
            </Alert>
            <Button asChild variant="outline" block>
              <Link href="/login">{t.toLogin}</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
