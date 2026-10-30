import { FaqAccordion } from "@snapbell/ui/disclosure";
import { ArrowRight, CloudOff, ScanFace } from "lucide-react";
import type { Metadata } from "next";
import { AppBadges } from "@/components/app-badges";
import { CheckList } from "@/components/blocks";
import { JsonLd } from "@/components/json-ld";
import { CheckInScreen, PhoneFrame } from "@/components/phone-mockup";
import { PageHero, Section, SectionHeading } from "@/components/section";
import { getLocale, htmlLang, pageMetadata } from "@/lib/i18n";
import { photoUri, PROOF_WATERMARK } from "@/lib/placeholder";
import { checkInMsgs } from "@/messages/features";

export async function generateMetadata({ params }: PageProps<"/[locale]/features/check-in">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/features/check-in", checkInMsgs[locale].meta);
}

export default async function CheckInPage({ params }: PageProps<"/[locale]/features/check-in">) {
  const locale = await getLocale(params);
  const t = checkInMsgs[locale];
  const sources = [photoUri({ seed: "match-ref" }), photoUri({ seed: "match-ref", watermark: PROOF_WATERMARK }), photoUri({ seed: "match-ref", watermark: PROOF_WATERMARK })];
  const frames = t.match.frames.map((f, i) => ({ ...f, src: sources[i]!, matched: i === 2 }));

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
      <PageHero
        eyebrow={t.hero.eyebrow}
        title={t.hero.title}
        lead={t.hero.lead}
        aside={
          <div className="relative mx-auto">
            <div aria-hidden className="absolute -bottom-6 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-sage/30 blur-2xl" />
            <PhoneFrame label={t.hero.phone} className="rotate-[-4deg]">
              <CheckInScreen locale={locale} />
            </PhoneFrame>
            <span className="absolute top-10 -right-2 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-bg shadow-overlay md:-right-10">
              <CloudOff className="size-4" aria-hidden /> {t.hero.offline}
            </span>
          </div>
        }
      >
        <AppBadges locale={locale} />
      </PageHero>

      <Section tone="sunken" labelledBy="day-heading">
        <SectionHeading id="day-heading" eyebrow={t.day.eyebrow} title={t.day.title} className="mb-10" />
        <div className="grid gap-6 lg:grid-cols-3">
          {t.day.blocks.map((block, i) => (
            <article key={block.title} className="grid content-start gap-4 rounded-card border border-border bg-surface p-6">
              <p className="font-display text-xl">
                <span className="mr-2 text-muted">0{i + 1}</span>
                {block.title}
              </p>
              <CheckList items={block.items} />
            </article>
          ))}
        </div>
      </Section>

      <Section labelledBy="match-heading">
        <SectionHeading id="match-heading" eyebrow={t.match.eyebrow} title={t.match.title} lead={t.match.lead} className="mb-12" />
        <ol className="flex flex-col items-center gap-4 md:flex-row md:justify-center" aria-label={t.match.aria}>
          {frames.map((f, i) => (
            <FrameItem key={f.label} index={i} last={i === frames.length - 1} {...f} />
          ))}
        </ol>
        <p className="mx-auto mt-10 flex max-w-xl items-start gap-3 rounded-card bg-sunken p-4 text-sm text-muted">
          <ScanFace className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
          {t.match.note}
        </p>
      </Section>

      <Section tone="sunken" labelledBy="faq-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <SectionHeading id="faq-heading" eyebrow={t.faqEyebrow} title={t.faqTitle} />
          <FaqAccordion items={t.faq} />
        </div>
      </Section>

      <Section id="download" labelledBy="download-heading">
        <div className="grid justify-items-center gap-5 text-center">
          <SectionHeading id="download-heading" align="center" title={t.download.title} lead={t.download.lead} />
          <AppBadges locale={locale} className="justify-center" />
        </div>
      </Section>
    </>
  );
}

/** One frame in the animated explainer. Frames and arrows alternate so the CSS nth-child delays line up. */
function FrameItem({ src, label, detail, matched, index, last }: { src: string; label: string; detail: string; matched?: boolean; index: number; last: boolean }) {
  return (
    <>
      <li className="match-frame grid w-48 justify-items-center gap-3 text-center">
        <div className="relative w-full overflow-hidden rounded-card border border-border bg-surface shadow-hover" style={{ aspectRatio: "4 / 5" }}>
          <img loading="lazy" decoding="async" src={src} alt={`${label}: ${detail}`} className={index === 0 ? "size-full scale-110 object-cover saturate-50" : "size-full object-cover"} />
          {matched && <span className="absolute inset-x-2 bottom-2 rounded-input bg-success px-2 py-1 text-xs font-semibold text-white">✓ Mia Chen · 98%</span>}
        </div>
        <span className="grid">
          <span className="font-semibold">
            {index + 1}. {label}
          </span>
          <span className="text-sm text-muted">{detail}</span>
        </span>
      </li>
      {!last && (
        <li aria-hidden className="grid place-items-center text-muted">
          <ArrowRight className="size-6 rotate-90 md:rotate-0" />
        </li>
      )}
    </>
  );
}
