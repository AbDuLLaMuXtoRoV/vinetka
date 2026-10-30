import { PLATFORM_FEE_STANDARD_BPS, formatters, passCredit } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { BellRing, CalendarClock, Mail, MessageSquare, Moon, Package, Send, Tag, Ticket } from "lucide-react";
import type { Metadata } from "next";
import { CheckList, SmsBubbles } from "@/components/blocks";
import { PageHero, Section, SectionHeading } from "@/components/section";
import { getLocale, pageMetadata } from "@/lib/i18n";
import { marketingFeatureMsgs } from "@/messages/marketing-feature";

export async function generateMetadata({ params }: PageProps<"/[locale]/features/marketing">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/features/marketing", marketingFeatureMsgs[locale].meta);
}

const TIMELINE_ICONS = [Send, BellRing, CalendarClock, Package];

export default async function MarketingFeaturePage({ params }: PageProps<"/[locale]/features/marketing">) {
  const locale = await getLocale(params);
  const t = marketingFeatureMsgs[locale];
  const fmt = formatters(locale);
  const passExample = passCredit(50_00, 1000);
  const [payBefore, payCredit, payAfter] = t.pass.payGet(fmt.money(50_00, { whole: true }), fmt.money(passExample));

  return (
    <>
      <PageHero
        eyebrow={t.hero.eyebrow}
        title={t.hero.title}
        lead={t.hero.lead}
        aside={
          <div className="grid place-items-center rounded-sheet bg-sage/15 p-6 md:p-10">
            <SmsBubbles locale={locale} messages={t.hero.sms.map((m, i) => ({ from: i === 1 ? "parent" : "studio", text: m.text, time: m.time || undefined }))} />
          </div>
        }
      />

      <Section tone="sunken" labelledBy="timeline-heading">
        <SectionHeading id="timeline-heading" eyebrow={t.timeline.eyebrow} title={t.timeline.title} lead={t.timeline.lead} className="mb-12" />
        <ol className="relative grid gap-6 lg:grid-cols-4">
          <span aria-hidden className="absolute top-6 right-[12%] left-[12%] hidden h-0.5 bg-ink/15 lg:block" />
          {t.timeline.steps.map((step, i) => {
            const Icon = TIMELINE_ICONS[i]!;
            return (
              <li key={step.title} className="relative grid content-start gap-3">
                <span className="relative z-10 grid size-12 place-items-center rounded-full border-4 border-sunken bg-ink text-bg lg:mx-auto">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="grid gap-2 rounded-card border border-border bg-surface p-5">
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                    <span className="sr-only">{t.timeline.step(i + 1)}</span>
                    {step.when}
                  </p>
                  <p className="text-lg font-semibold">{step.title}</p>
                  <Badge tone="outline" className="w-fit">
                    {step.email ? <Mail aria-hidden /> : <MessageSquare aria-hidden />} {step.channel}
                  </Badge>
                  <p className="rounded-input bg-sunken p-3 text-sm">“{step.text}”</p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted">
          <Moon className="size-4 shrink-0" aria-hidden /> {t.timeline.quiet}
        </p>
      </Section>

      <Section labelledBy="pass-heading">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="grid content-start gap-5">
            <SectionHeading id="pass-heading" eyebrow={t.pass.eyebrow} title={t.pass.title} lead={t.pass.lead} />
            <CheckList items={t.pass.bullets} />
          </div>
          <div className="mx-auto grid w-full max-w-sm gap-4 rounded-card border border-border bg-surface p-6 shadow-overlay">
            <div className="flex items-center gap-2">
              <Ticket className="size-5 shrink-0" aria-hidden />
              <p className="font-semibold">{t.pass.cardTitle}</p>
            </div>
            <p className="text-sm text-muted">{t.pass.cardBody}</p>
            <div className="grid grid-cols-3 gap-2">
              {[25_00, 50_00, 75_00].map((a) => (
                <span key={a} className={a === 50_00 ? "rounded-input border-2 border-ink p-3 text-center font-semibold" : "rounded-input border border-border p-3 text-center"}>
                  {fmt.money(a, { whole: true })}
                </span>
              ))}
            </div>
            <p className="rounded-input bg-success/10 p-3 text-sm">
              {payBefore}
              <strong>{payCredit}</strong>
              {payAfter}
            </p>
            <span className="rounded-input bg-ink py-3 text-center text-sm font-semibold text-bg">{t.pass.buy}</span>
          </div>
        </div>
      </Section>

      <Section tone="sunken" labelledBy="promo-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <SectionHeading id="promo-heading" eyebrow={t.promo.eyebrow} title={t.promo.title} lead={t.promo.lead} />
          <div className="grid gap-3">
            {t.promo.codes.map((p) => (
              <div key={p.code} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
                <span className="flex items-center gap-3">
                  <Tag className="size-4 shrink-0 text-muted" aria-hidden />
                  <code className="rounded bg-sunken px-2 py-1 font-mono text-sm font-semibold">{p.code}</code>
                  <span className="text-sm text-muted">{p.rule}</span>
                </span>
                <Badge tone="sage">{p.used}</Badge>
              </div>
            ))}
            <p className="text-sm text-muted">{t.promo.note(fmt.percent(PLATFORM_FEE_STANDARD_BPS / 10_000))}</p>
          </div>
        </div>
      </Section>
    </>
  );
}
