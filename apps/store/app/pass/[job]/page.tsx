import { Button } from "@snapbell/ui/button";
import { ErrorPage } from "@snapbell/ui/feedback";
import { brandStyle } from "@snapbell/ui/lib/brand";
import { initials } from "@snapbell/ui/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import { PassForm } from "@/components/pass-form";
import { load } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { metaMsgs } from "@/messages/meta";
import { serverMsgs } from "@/messages/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].pass };
}

/** Screen 12: pre-pay before picture day. No parent session needed. */
export default async function PassPage({ params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  const res = await load((c) => c.passes.offer(job));

  if (!res.ok) {
    const locale = await getLocale();
    const t = serverMsgs[locale].pass;
    return (
      <ErrorPage
        locale={locale}
        code={res.error.kind === "not_found" || res.error.kind === "access" ? 404 : 500}
        title={res.error.kind === "not_found" || res.error.kind === "access" ? t.unavailable : t.cantLoad}
        description={t.body}
        action={
          <Button variant="outline" asChild>
            <Link href="/">{t.findPhotos}</Link>
          </Button>
        }
      />
    );
  }
  const offer = res.data;

  return (
    <div style={brandStyle(offer.studio.brandColor)} className="min-h-dvh bg-bg">
      <header className="border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-2.5 px-4 font-semibold">
          {offer.studio.logoUrl ? (
            <img src={offer.studio.logoUrl} alt="" className="h-8 w-auto max-w-28 object-contain" />
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink" aria-hidden>
              {initials(offer.studio.name)}
            </span>
          )}
          {offer.studio.name}
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pt-8 pb-16">
        <PassForm offer={offer} />
      </main>
    </div>
  );
}
