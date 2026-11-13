import { MessageSquareText, Printer, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FindPhotosForm } from "@site/components/forms/find-photos-form";
import { getLocale, localePath, pageMetadata } from "@site/lib/i18n";
import { findMsgs } from "@site/messages/pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/find-my-photos">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/find-my-photos", findMsgs[locale].meta);
}

export default async function FindMyPhotosPage({ params }: PageProps<"/[locale]/find-my-photos">) {
  const locale = await getLocale(params);
  const t = findMsgs[locale];
  return (
    <section className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto grid max-w-content gap-12 lg:grid-cols-[28rem_1fr] lg:items-start">
        <div className="grid gap-6 rounded-card border border-border bg-surface p-6 md:p-8">
          <div className="grid gap-2">
            <span className="grid size-12 place-items-center rounded-full bg-accent text-accent-ink">
              <Search className="size-6" aria-hidden />
            </span>
            <h1 className="font-display text-2xl">{t.title}</h1>
            <p className="text-muted">{t.lead}</p>
          </div>
          <FindPhotosForm />
        </div>

        <div className="grid grid-cols-1 content-start gap-6">
          <h2 className="text-xl font-semibold">{t.whereTitle}</h2>
          <div className="grid gap-4">
            <div className="flex gap-4 rounded-card bg-sunken p-5">
              <MessageSquareText className="mt-0.5 size-6 shrink-0" aria-hidden />
              <div className="grid gap-1">
                <p className="font-semibold">{t.text.title}</p>
                <p className="text-muted">{t.text.body}</p>
              </div>
            </div>
            <div className="flex gap-4 rounded-card bg-sunken p-5">
              <Printer className="mt-0.5 size-6 shrink-0" aria-hidden />
              <div className="grid gap-1">
                <p className="font-semibold">{t.paper.title}</p>
                <p className="text-muted">{t.paper.body}</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted">
            {t.stuck[0]}
            <Link href={localePath(locale, "/help/find-my-photos-code")} className="font-medium text-ink underline underline-offset-4">
              {t.stuck[1]}
            </Link>
            {t.stuck[2]}
          </p>
          <p className="text-xs text-muted">{t.privacy}</p>
        </div>
      </div>
    </section>
  );
}
