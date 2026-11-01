import { Button } from "@snapbell/ui/button";
import type { Metadata } from "next";
import Link from "next/link";
import { FeatureBlock, MediaPanel, SmsBubbles } from "@/components/blocks";
import { CheckInScreen, PhoneFrame, StoreAlbumScreen } from "@/components/phone-mockup";
import { PageHero, Section } from "@/components/section";
import { getLocale, localePath, pageMetadata } from "@/lib/i18n";
import { photoUri, PROOF_WATERMARK } from "@/lib/placeholder";
import { featuresMsgs } from "@/messages/features";

export async function generateMetadata({ params }: PageProps<"/[locale]/features">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/features", featuresMsgs[locale].meta);
}

const SECTIONS = ["workflow", "store", "marketing", "protection"] as const;

export default async function FeaturesPage({ params }: PageProps<"/[locale]/features">) {
  const locale = await getLocale(params);
  const t = featuresMsgs[locale];
  return (
    <>
      <PageHero eyebrow={t.hero.eyebrow} title={t.hero.title} lead={t.hero.lead}>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={localePath(locale, "/contact")}>{t.hero.partner}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={localePath(locale, "/demo")}>{t.hero.demo}</Link>
          </Button>
        </div>
      </PageHero>

      <nav aria-label={t.subnavAria} className="sticky top-16 z-30 border-y border-border bg-bg/95 backdrop-blur-md">
        <ul className="mx-auto flex max-w-content gap-1 overflow-x-auto px-4 md:px-6">
          {SECTIONS.map((id) => (
            <li key={id}>
              <a href={`#${id}`} className="inline-flex min-h-12 items-center px-3 text-sm font-medium whitespace-nowrap text-muted hover:text-ink">
                {t.subnav[id]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section innerClassName="grid gap-24">
        <FeatureBlock
          id="workflow"
          eyebrow={t.workflow.eyebrow}
          title={t.workflow.title}
          body={t.workflow.body}
          href={localePath(locale, "/features/check-in")}
          linkLabel={t.workflow.link}
          media={
            <MediaPanel>
              <PhoneFrame label={t.workflow.phone}>
                <CheckInScreen locale={locale} />
              </PhoneFrame>
            </MediaPanel>
          }
        />
        <FeatureBlock
          id="store"
          reverse
          eyebrow={t.store.eyebrow}
          title={t.store.title}
          body={t.store.body}
          href={localePath(locale, "/features/family-store")}
          linkLabel={t.store.link}
          media={
            <MediaPanel tone="accent">
              <PhoneFrame label={t.store.phone}>
                <StoreAlbumScreen locale={locale} />
              </PhoneFrame>
            </MediaPanel>
          }
        />
        <FeatureBlock
          id="marketing"
          eyebrow={t.marketing.eyebrow}
          title={t.marketing.title}
          body={t.marketing.body}
          href={localePath(locale, "/features/marketing")}
          linkLabel={t.marketing.link}
          media={
            <MediaPanel tone="sunken">
              <SmsBubbles
                locale={locale}
                messages={t.marketing.sms.map((m, i) => ({ from: i < 2 ? "studio" : "parent", text: m.text, time: m.time || undefined }))}
              />
            </MediaPanel>
          }
        />
        <FeatureBlock
          id="protection"
          reverse
          eyebrow={t.protection.eyebrow}
          title={t.protection.title}
          body={t.protection.body}
          href={localePath(locale, "/help/photo-protection")}
          linkLabel={t.protection.link}
          media={
            <MediaPanel tone="sage">
              <img
                src={photoUri({ seed: "features-protect", watermark: PROOF_WATERMARK, overlay: t.protection.overlay })}
                alt={t.protection.alt}
                className="w-full max-w-xs rounded-card shadow-overlay"
              />
            </MediaPanel>
          }
        />
      </Section>
    </>
  );
}
