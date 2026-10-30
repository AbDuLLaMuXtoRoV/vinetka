import { Button } from "@snapbell/ui/button";
import { TabsContent, TabsList, TabsTrigger } from "@snapbell/ui/disclosure";
import { ArrowRight, Images, Package, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CaseStudyCard, CheckList } from "@/components/blocks";
import { HashTabs } from "@/components/islands";
import { PageHero, Section } from "@/components/section";
import { getMarkets } from "@/lib/cms";
import { getLocale, localePath, pageMetadata } from "@/lib/i18n";
import { photoUri } from "@/lib/placeholder";
import { marketsPageMsgs } from "@/messages/pricing";

export async function generateMetadata({ params }: PageProps<"/[locale]/markets">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/markets", marketsPageMsgs[locale].meta);
}

export default async function MarketsPage({ params }: PageProps<"/[locale]/markets">) {
  const locale = await getLocale(params);
  const t = marketsPageMsgs[locale];
  const markets = getMarkets(locale);
  const ids = markets.map((m) => m.id);
  return (
    <>
      <PageHero eyebrow={t.hero.eyebrow} title={t.hero.title} lead={t.hero.lead} />

      <Section className="pt-0 md:pt-0">
        {/* Invisible anchors so /markets#sports scrolls here; HashTabs selects the tab. */}
        {ids.map((id) => (
          <span key={id} id={id} className="block scroll-mt-24" aria-hidden />
        ))}
        <HashTabs values={ids} defaultValue="schools">
          <TabsList aria-label={t.tabsAria} className="w-fit max-w-full">
            {markets.map((m) => (
              <TabsTrigger key={m.id} value={m.id}>
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {markets.map((m) => (
            <TabsContent key={m.id} value={m.id} className="grid gap-12">
              <div className="grid items-center gap-10 lg:grid-cols-2">
                <div className="overflow-hidden rounded-sheet bg-sunken" style={{ aspectRatio: "4 / 3" }}>
                  <img loading="lazy" decoding="async" src={photoUri({ seed: m.image.seed, kind: m.image.kind })} alt={m.image.alt} className="size-full object-cover" />
                </div>
                <div className="grid content-start gap-5">
                  <h2 className="font-display text-2xl text-balance">{m.headline}</h2>
                  <p className="text-lg text-muted">{m.summary}</p>
                  <CheckList items={m.bullets} />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="grid content-start gap-5 rounded-card border border-border bg-surface p-6">
                  <h3 className="text-xl font-semibold">{t.workflow}</h3>
                  <dl className="grid gap-4 md:grid-cols-3">
                    <div className="grid gap-1">
                      <dt className="flex items-center gap-2 text-sm text-muted">
                        <Images className="size-4 shrink-0" aria-hidden /> {t.albumType}
                      </dt>
                      <dd className="font-medium">{m.workflow.albumType}</dd>
                    </div>
                    <div className="grid gap-1">
                      <dt className="flex items-center gap-2 text-sm text-muted">
                        <Truck className="size-4 shrink-0" aria-hidden /> {t.shipping}
                      </dt>
                      <dd className="font-medium">{m.workflow.shipping}</dd>
                    </div>
                    <div className="grid gap-1">
                      <dt className="flex items-center gap-2 text-sm text-muted">
                        <Package className="size-4 shrink-0" aria-hidden /> {t.products}
                      </dt>
                      <dd className="font-medium">{m.workflow.products.join(", ")}</dd>
                    </div>
                  </dl>
                  <blockquote className="border-l-4 border-accent pl-4">
                    <p>“{m.quote.text}”</p>
                    <footer className="mt-1 text-sm text-muted">
                      {m.quote.name}, {m.quote.role}
                    </footer>
                  </blockquote>
                </div>
                <CaseStudyCard locale={locale} market={m.label} {...m.caseStudy} />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href={localePath(locale, "/signup")}>
                    {t.startFor(m.label)} <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href={localePath(locale, "/demo")}>{t.demo}</Link>
                </Button>
              </div>
            </TabsContent>
          ))}
        </HashTabs>
      </Section>
    </>
  );
}
