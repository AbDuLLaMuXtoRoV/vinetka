import type { Locale } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { localePath } from "@/lib/i18n";
import { commonMsgs } from "@/messages/common";

/** The closing band on every page: "Become a partner" + "Book a demo". Studios are onboarded by the Snapbell team. */
export function CtaBand({ locale }: { locale: Locale }) {
  const t = commonMsgs[locale].cta;
  return (
    <section aria-labelledby="cta-heading" className="px-4 py-16 md:px-6">
      <div className="relative mx-auto grid max-w-content gap-8 overflow-hidden rounded-sheet bg-ink px-6 py-12 text-bg md:grid-cols-[1fr_auto] md:items-center md:px-12 md:py-16">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative grid gap-3">
          <h2 id="cta-heading" className="font-display text-2xl text-balance md:text-3xl">
            {t.title}
          </h2>
          <p className="max-w-xl text-lg opacity-80">{t.body}</p>
        </div>
        <div className="relative flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={localePath(locale, "/contact")}>
              {t.partner} <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-bg/60 text-bg hover:bg-bg/10">
            <Link href={localePath(locale, "/demo")}>{t.demo}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
