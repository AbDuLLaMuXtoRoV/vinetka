import { MARKETS } from "@snapbell/sdk";
import { Clock, MonitorPlay, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { DemoForm } from "@/components/forms/demo-form";
import { PageHero, Section } from "@/components/section";
import { getLocale, pageMetadata } from "@/lib/i18n";
import { marketLabels } from "@/lib/site";
import { demoMsgs } from "@/messages/pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/demo">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/demo", demoMsgs[locale].meta);
}

const PERK_ICONS = [Clock, MonitorPlay, UserRound];

export default async function DemoPage({ params }: PageProps<"/[locale]/demo">) {
  const locale = await getLocale(params);
  const t = demoMsgs[locale];
  const labels = marketLabels(locale);
  const calendarUrl = process.env.NEXT_PUBLIC_CALCOM_URL || null;
  return (
    <>
      <PageHero eyebrow={t.hero.eyebrow} title={t.hero.title} lead={t.hero.lead}>
        <ul className="grid gap-3 text-muted md:grid-cols-3">
          {t.hero.perks.map((perk, i) => {
            const Icon = PERK_ICONS[i]!;
            return (
              <li key={perk} className="flex items-center gap-2">
                <Icon className="size-5 shrink-0 text-ink" aria-hidden /> {perk}
              </li>
            );
          })}
        </ul>
      </PageHero>
      <Section className="pt-0 md:pt-0">
        <div className="mx-auto max-w-3xl rounded-card border border-border bg-surface p-6 md:p-10">
          <DemoForm calendarUrl={calendarUrl} markets={MARKETS.map((m) => ({ value: m, label: labels[m] }))} />
        </div>
      </Section>
    </>
  );
}
