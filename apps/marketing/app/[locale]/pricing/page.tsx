import { PLATFORM_FEE_STANDARD_BPS, PLATFORM_FEE_VOLUME_BPS, VOLUME_TIER_THRESHOLD_CENTS, formatters } from "@snapbell/sdk";
import { FaqAccordion } from "@snapbell/ui/disclosure";
import type { Metadata } from "next";
import { CheckList } from "@/components/blocks";
import { TrackedFeeCalculator } from "@/components/islands";
import { JsonLd } from "@/components/json-ld";
import { MoneyFlow, PricingTable } from "@/components/pricing";
import { PageHero, Section, SectionHeading } from "@/components/section";
import { getLocale, htmlLang, pageMetadata } from "@/lib/i18n";
import { pricingMsgs } from "@/messages/pricing";

export async function generateMetadata({ params }: PageProps<"/[locale]/pricing">): Promise<Metadata> {
  const locale = await getLocale(params);
  const t = pricingMsgs[locale].meta;
  const fmt = formatters(locale);
  const pct = (b: number) => fmt.percent(b / 10_000);
  return pageMetadata(locale, "/pricing", {
    title: t.title,
    ogTitle: t.ogTitle,
    description: t.description(pct(PLATFORM_FEE_STANDARD_BPS), fmt.money(VOLUME_TIER_THRESHOLD_CENTS, { whole: true }), pct(PLATFORM_FEE_VOLUME_BPS)),
  });
}

export default async function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  const locale = await getLocale(params);
  const t = pricingMsgs[locale];
  const fmt = formatters(locale);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: htmlLang(locale),
          mainEntity: t.faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
        }}
      />
      <PageHero eyebrow={t.hero.eyebrow} title={t.hero.title} lead={t.hero.lead(fmt.percent(PLATFORM_FEE_VOLUME_BPS / 10_000))} />

      <Section className="pt-0 md:pt-0" labelledBy="calc-heading">
        <h2 id="calc-heading" className="sr-only">
          {t.calcHeading}
        </h2>
        <TrackedFeeCalculator variant="full" source="pricing" />
      </Section>

      <Section tone="sunken" labelledBy="tiers-heading">
        <SectionHeading id="tiers-heading" eyebrow={t.tiers.eyebrow} title={t.tiers.title} className="mb-10" />
        <PricingTable locale={locale} />
      </Section>

      <Section labelledBy="included-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <SectionHeading id="included-heading" eyebrow={t.included.eyebrow} title={t.included.title} />
          <CheckList className="md:grid-cols-2" items={t.included.items} />
        </div>
      </Section>

      <Section tone="sunken" labelledBy="flow-heading">
        <SectionHeading id="flow-heading" eyebrow={t.flow.eyebrow} title={t.flow.title} className="mb-10" />
        <MoneyFlow locale={locale} />
      </Section>

      <Section labelledBy="faq-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <SectionHeading id="faq-heading" eyebrow={t.faqEyebrow} title={t.faqTitle} />
          <FaqAccordion items={t.faq} />
        </div>
      </Section>
    </>
  );
}
