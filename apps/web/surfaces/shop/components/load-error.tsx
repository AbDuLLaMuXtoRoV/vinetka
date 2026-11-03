import { formatters } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { ErrorPage } from "@snapbell/ui/feedback";
import { CalendarClock, LockKeyhole, SearchX } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LoadError } from "@shop/lib/api";
import { dayInSentence } from "@shop/lib/dates";
import { getLocale } from "@shop/lib/i18n";
import { accessMsgs } from "@shop/messages/access";
import { serverMsgs } from "@shop/messages/server";
import { NotifyMeForm } from "./notify-me-form";

/** Renders an album access problem: not yet published, expired, bad code, or the API being down. */
export async function LoadErrorView({ error, code }: { error: LoadError; code?: string }) {
  if (error.kind === "unauthorized") redirect(code ? `/shop/verify?code=${code}` : "/shop/verify");

  const locale = await getLocale();
  const a = accessMsgs[locale];
  const t = serverMsgs[locale].load;

  if (error.kind === "access") {
    const studio = error.studio?.name ?? null;
    if (error.error === "not_published") {
      const day = error.publishAt ? dayInSentence(formatters(locale), error.publishAt) : null;
      return (
        <div className="mx-auto grid max-w-md gap-6 px-4 py-12 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent/20 text-ink">
            <CalendarClock className="size-7" aria-hidden />
          </div>
          <div className="grid gap-2">
            <h1 className="text-xl font-semibold text-balance">{a.notReadyTitle}</h1>
            <p className="text-muted">{a.notReadyBody(studio, day)}</p>
          </div>
          {code && <NotifyMeForm code={code} />}
        </div>
      );
    }
    if (error.error === "expired") {
      return (
        <ErrorPage
          locale={locale}
          code={410}
          title={a.closedTitle}
          description={a.closedBody(studio)}
          action={
            <Button variant="outline" asChild>
              <Link href="/shop">{t.enterAnother}</Link>
            </Button>
          }
        />
      );
    }
    return (
      <div className="mx-auto grid max-w-md justify-items-center gap-4 px-4 py-16 text-center">
        <SearchX className="size-10 text-muted" aria-hidden />
        <h1 className="text-xl font-semibold">{a.invalidTitle}</h1>
        <p className="text-muted">{t.invalidBody}</p>
        <Button asChild>
          <Link href="/shop">{t.tryAgain}</Link>
        </Button>
      </div>
    );
  }

  if (error.kind === "not_found") {
    return (
      <ErrorPage
        locale={locale}
        code={404}
        title={t.notFoundTitle}
        description={t.notFoundBody}
        action={
          <Button asChild>
            <Link href="/shop/account">{t.myAccount}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-4 px-4 py-16 text-center">
      <LockKeyhole className="size-10 text-muted" aria-hidden />
      <h1 className="text-xl font-semibold">{t.cantLoad}</h1>
      <p className="text-muted">{error.message}</p>
      <Button variant="outline" asChild>
        <a href="">{t.reload}</a>
      </Button>
    </div>
  );
}
