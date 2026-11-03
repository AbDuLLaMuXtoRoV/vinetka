import { DEMO_CODES, SHIPPING_CENTS, bps, formatters } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Crop, EyeOff, Images, Lock, Palette, Stamp, Type, Users, UserRound, Wand } from "lucide-react";
import type { Metadata } from "next";
import { CheckList } from "@site/components/blocks";
import { PageHero, Section, SectionHeading } from "@site/components/section";
import { StoreDemo } from "@site/components/store-demo";
import { getLocale, pageMetadata } from "@site/lib/i18n";
import { storeLink } from "@site/lib/parent-links";
import { photoUri, PROOF_WATERMARK } from "@site/lib/placeholder";
import { familyStoreMsgs } from "@site/messages/family-store";

export async function generateMetadata({ params }: PageProps<"/[locale]/features/family-store">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/features/family-store", familyStoreMsgs[locale].meta);
}

const ALBUM_ICONS = [UserRound, Users, Images];
const CUSTOM_ICONS = [Crop, Palette, Type, Wand];
const PROTECT_ICONS = [Stamp, Lock, EyeOff, UserRound];

export default async function FamilyStorePage({ params }: PageProps<"/[locale]/features/family-store">) {
  const locale = await getLocale(params);
  const t = familyStoreMsgs[locale];
  const { money } = formatters(locale);
  const sampleStore = storeLink(locale, `/a/${DEMO_CODES.personal}`);
  const photos = ["fs-demo-1", "fs-demo-2", "fs-demo-3", "fs-demo-4"].map((seed) => photoUri({ seed, watermark: PROOF_WATERMARK }));
  const bundle = 69_00;
  const tax = bps(bundle + SHIPPING_CENTS.home, 600);
  const prices = {
    bundle: money(bundle),
    bundleValue: money(93_00),
    essentials: money(39_00),
    digital: money(19_00),
    shipping: money(SHIPPING_CENTS.home),
    tax: money(tax),
    total: money(bundle + SHIPPING_CENTS.home + tax),
  };

  return (
    <>
      <PageHero eyebrow={t.hero.eyebrow} title={t.hero.title} lead={t.hero.lead} aside={<StoreDemo photos={photos} prices={prices} />}>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href={sampleStore}>
              <Images aria-hidden /> {t.hero.trySample}
            </a>
          </Button>
        </div>
        <p className="text-sm text-muted">{t.hero.hint}</p>
      </PageHero>

      <Section tone="sunken" labelledBy="albums-heading">
        <SectionHeading id="albums-heading" eyebrow={t.albums.eyebrow} title={t.albums.title} className="mb-10" />
        <div className="grid gap-6 md:grid-cols-3">
          {t.albums.items.map((a, i) => {
            const Icon = ALBUM_ICONS[i]!;
            return (
              <article key={a.title} className="grid content-start gap-3 rounded-card border border-border bg-surface p-6">
                <span className="grid size-11 place-items-center rounded-input bg-accent text-accent-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="text-xl font-semibold">{a.title}</h3>
                <p className="text-muted">{a.body}</p>
                <p className="text-sm font-medium">{t.albums.bestFor(a.best)}</p>
              </article>
            );
          })}
        </div>
      </Section>

      <Section labelledBy="custom-heading">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="grid content-start gap-5">
            <SectionHeading id="custom-heading" eyebrow={t.custom.eyebrow} title={t.custom.title} lead={t.custom.lead} />
            <ul className="grid gap-3 md:grid-cols-2">
              {t.custom.features.map((label, i) => {
                const Icon = CUSTOM_ICONS[i]!;
                return (
                  <li key={label} className="flex items-center gap-3 rounded-input bg-sunken p-3">
                    <Icon className="size-5 shrink-0" aria-hidden />
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mx-auto grid w-full max-w-md gap-3 rounded-sheet bg-surface p-6 shadow-overlay">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15" aria-hidden />
            <p className="font-semibold">{t.custom.product}</p>
            <div className="relative mx-auto w-48 overflow-hidden rounded-input border-8 border-surface shadow-hover" style={{ aspectRatio: "3.5 / 5" }}>
              <img loading="lazy" decoding="async" src={photoUri({ seed: "fs-demo-2" })} alt={t.custom.previewAlt} className="size-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-1.5 text-center font-display text-lg text-bg">Ava</span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {t.custom.themes.map((theme, i) => (
                <span key={theme} className={i === 1 ? "rounded-input border-2 border-ink px-3 py-1.5 font-medium" : "rounded-input border border-border px-3 py-1.5"}>
                  {theme}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted">{t.custom.note}</p>
          </div>
        </div>
      </Section>

      <Section tone="sunken" labelledBy="store-protect-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeading id="store-protect-heading" eyebrow={t.protect.eyebrow} title={t.protect.title} />
          <CheckList
            items={t.protect.items.map((text, i) => {
              const Icon = PROTECT_ICONS[i]!;
              return (
                <span key={text} className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0" aria-hidden /> {text}
                </span>
              );
            })}
          />
        </div>
      </Section>

      <Section labelledBy="try-heading">
        <div className="grid justify-items-center gap-5 text-center">
          <SectionHeading id="try-heading" align="center" title={t.try.title} lead={t.try.lead} />
          <Button asChild size="lg" variant="secondary">
            <a href={sampleStore}>{t.try.button}</a>
          </Button>
        </div>
      </Section>
    </>
  );
}
