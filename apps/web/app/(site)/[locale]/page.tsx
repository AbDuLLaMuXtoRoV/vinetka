import { DEMO_CODES } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@snapbell/ui/disclosure";
import { ArrowRight, Camera, Check, ClipboardList, EyeOff, Images, ScanFace, ShieldCheck, ShoppingBag, Stamp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CaseStudyCard, CheckList, FeatureBlock, LogoStrip, MediaPanel, SmsBubbles, StepList } from "@site/components/blocks";
import { JsonLd } from "@site/components/json-ld";
import { PhoneFrame, StoreAlbumScreen } from "@site/components/phone-mockup";
import { Section, SectionHeading } from "@site/components/section";
import { getMarkets } from "@site/lib/cms";
import { env } from "@site/lib/env";
import { getLocale, htmlLang, localePath, pageMetadata } from "@site/lib/i18n";
import { storeLink } from "@site/lib/parent-links";
import { photoUri, PROOF_WATERMARK } from "@site/lib/placeholder";
import { COMPANY, SITE_NAME } from "@site/lib/site";
import { commonMsgs } from "@site/messages/common";
import { homeMsgs } from "@site/messages/home";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await getLocale(params);
  const t = homeMsgs[locale];
  return pageMetadata(locale, "/", { title: { absolute: t.meta.title }, ogTitle: t.meta.ogTitle, description: commonMsgs[locale].siteDescription });
}

const STEP_ICONS = [ClipboardList, Camera, ScanFace, ShoppingBag];

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await getLocale(params);
  const t = homeMsgs[locale];
  const markets = getMarkets(locale);
  const sampleStore = storeLink(locale, `/a/${DEMO_CODES.personal}`);
  const protectedPhoto = photoUri({ seed: "protect-1", watermark: PROOF_WATERMARK, overlay: t.protect.overlay });
  const blurredPhoto = photoUri({ seed: "protect-1" });
  const workflowImage = photoUri({ seed: "trio-workflow", kind: "group" });
  const storeImage = photoUri({ seed: "trio-store", watermark: PROOF_WATERMARK });
  const linkClass = "inline-flex min-h-11 w-fit items-center gap-2 font-semibold underline decoration-2 underline-offset-4 hover:no-underline";

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: env.siteUrl,
            logo: `${env.siteUrl}/opengraph-image`,
            email: COMPANY.email,
            address: COMPANY.address,
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: SITE_NAME,
            inLanguage: htmlLang(locale),
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web, iOS, Android",
            description: commonMsgs[locale].siteDescription,
          },
        ]}
      />

      {/* 1. Hero */}
      <section className="overflow-hidden px-4 pt-10 pb-16 md:px-6 md:pt-16 md:pb-24">
        <div className="mx-auto grid max-w-content items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div className="grid content-start gap-6">
            <p className="w-fit rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-ink">{t.hero.badge}</p>
            <h1 className="font-display text-3xl text-balance lg:text-4xl">{t.hero.title}</h1>
            <p className="max-w-xl text-lg text-muted text-pretty">{t.hero.lead}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={localePath(locale, "/contact")}>
                  {t.hero.partner} <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={sampleStore}>{t.hero.sample}</a>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {t.hero.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-1.5">
                  <Check className="size-4 text-success" aria-hidden />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div aria-hidden className="absolute inset-x-8 top-10 bottom-0 -z-10 rounded-sheet bg-accent/25" />
            <PhoneFrame label={t.hero.phoneLabel}>
              <StoreAlbumScreen locale={locale} />
            </PhoneFrame>
          </div>
        </div>
      </section>

      {/* 2. Trust strip */}
      <Section tone="surface" className="py-12 md:py-14">
        <LogoStrip
          locale={locale}
          note={
            <>
              <span>{t.trust.labs}</span>
              <span aria-hidden>·</span>
              <span>{t.trust.languages}</span>
              <span aria-hidden>·</span>
              <span>{t.trust.team}</span>
            </>
          }
        />
      </Section>

      {/* 3. How it works */}
      <Section labelledBy="how-heading">
        <SectionHeading id="how-heading" eyebrow={t.how.eyebrow} title={t.how.title} className="mb-12" />
        <StepList locale={locale} steps={t.how.steps.map((s, i) => ({ ...s, icon: STEP_ICONS[i]! }))} />
      </Section>

      {/* 4. Market tabs */}
      <Section tone="sunken" labelledBy="markets-heading">
        <SectionHeading id="markets-heading" eyebrow={t.markets.eyebrow} title={t.markets.title} className="mb-10" />
        <Tabs defaultValue="schools">
          <TabsList aria-label={t.markets.tabsAria} className="w-fit max-w-full">
            {markets.map((m) => (
              <TabsTrigger key={m.id} value={m.id}>
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {markets.map((m) => (
            <TabsContent key={m.id} value={m.id}>
              <div className="grid items-center gap-10 lg:grid-cols-2">
                <div className="overflow-hidden rounded-sheet bg-surface" style={{ aspectRatio: "3 / 2" }}>
                  <img loading="lazy" decoding="async" src={photoUri({ seed: m.image.seed, kind: m.image.kind })} alt={m.image.alt} className="size-full object-cover" />
                </div>
                <div className="grid content-start gap-5">
                  <h3 className="font-display text-xl md:text-2xl">{m.headline}</h3>
                  <CheckList items={m.bullets} />
                  <blockquote className="border-l-4 border-accent pl-4">
                    <p className="text-lg">“{m.quote.text}”</p>
                    <footer className="mt-2 text-sm text-muted">
                      {m.quote.name}, {m.quote.role}
                    </footer>
                  </blockquote>
                  <a href={localePath(locale, `/markets#${m.id}`)} className={linkClass}>
                    {t.markets.seeWorkflow(m.label)} <ArrowRight className="size-4" aria-hidden />
                  </a>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Section>

      {/* 5. Feature trio */}
      <Section labelledBy="trio-heading">
        <SectionHeading id="trio-heading" eyebrow={t.trio.eyebrow} title={t.trio.title} className="mb-12" />
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              ...t.trio.workflow,
              href: "/features/check-in",
              media: <img loading="lazy" decoding="async" src={workflowImage} alt={t.trio.workflow.alt} className="size-full object-cover" />,
            },
            {
              ...t.trio.marketing,
              href: "/features/marketing",
              media: (
                <div className="grid size-full place-items-center bg-sage/20 p-4">
                  <SmsBubbles
                    locale={locale}
                    className="shadow-none"
                    messages={[
                      { from: "studio", text: t.trio.marketing.sms[0]! },
                      { from: "parent", text: t.trio.marketing.sms[1]! },
                    ]}
                  />
                </div>
              ),
            },
            {
              ...t.trio.store,
              href: "/features/family-store",
              media: <img loading="lazy" decoding="async" src={storeImage} alt={t.trio.store.alt} className="size-full object-cover" />,
            },
          ].map((f) => (
            <article key={f.href} className="grid content-start overflow-hidden rounded-card border border-border bg-surface">
              <div className="overflow-hidden bg-sunken" style={{ aspectRatio: "3 / 2" }}>
                {f.media}
              </div>
              <div className="grid gap-4 p-6">
                <h3 className="text-xl font-semibold">{f.title}</h3>
                <CheckList items={f.bullets} />
                <Link href={localePath(locale, f.href)} className={linkClass}>
                  {f.link} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* 6. Photo protection */}
      <Section tone="sunken" labelledBy="protect-heading">
        <FeatureBlock
          eyebrow={t.protect.eyebrow}
          title={t.protect.title}
          body={t.protect.body}
          bullets={t.protect.bullets}
          media={
            <MediaPanel tone="sunken" className="bg-surface">
              <div className="grid w-full max-w-md grid-cols-2 gap-4">
                <figure className="grid gap-2">
                  <img loading="lazy" decoding="async" src={protectedPhoto} alt={t.protect.watermarkAlt} className="w-full rounded-card" />
                  <figcaption className="flex items-center gap-1.5 text-sm font-medium">
                    <Stamp className="size-4 shrink-0" aria-hidden /> {t.protect.watermarkCaption}
                  </figcaption>
                </figure>
                <figure className="grid gap-2">
                  <div className="overflow-hidden rounded-card">
                    <img loading="lazy" decoding="async" src={blurredPhoto} alt={t.protect.blurAlt} className="w-full scale-105 blur-lg" />
                  </div>
                  <figcaption className="flex items-center gap-1.5 text-sm font-medium">
                    <EyeOff className="size-4 shrink-0" aria-hidden /> {t.protect.blurCaption}
                  </figcaption>
                </figure>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-muted">
                <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden /> {t.protect.signed}
              </p>
            </MediaPanel>
          }
        />
      </Section>

      {/* 7. Case studies (default tone: the protection section above is sunken) */}
      <Section labelledBy="cases-heading">
        <SectionHeading id="cases-heading" eyebrow={t.cases.eyebrow} title={t.cases.title} className="mb-10" />
        <div className="grid gap-6 md:grid-cols-3">
          {markets.slice(0, 3).map((m) => (
            <CaseStudyCard key={m.id} locale={locale} market={m.label} {...m.caseStudy} />
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline">
            <a href={sampleStore}>
              <Images aria-hidden /> {t.cases.trySample}
            </a>
          </Button>
        </div>
      </Section>
      {/* 8. CTA band ("Become a partner") is rendered by the locale layout on every page. */}
    </>
  );
}
