import { formatPhoneDisplay, toE164 } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { LogIn, Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PartnerForm } from "@/components/forms/partner-form";
import { PageHero, Section, SectionHeading } from "@/components/section";
import { env } from "@/lib/env";
import { getLocale, localePath, pageMetadata } from "@/lib/i18n";
import { shopSignInUrl, studioLoginUrl } from "@/lib/site";
import { contactMsgs } from "@/messages/pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/contact", contactMsgs[locale].meta);
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const locale = await getLocale(params);
  const t = contactMsgs[locale];
  const { phone, email, telegram } = env.contact;
  const phoneE164 = phone ? (toE164(phone) ?? phone) : null;
  const channels = [
    phoneE164 && { href: `tel:${phoneE164}`, label: t.channels.phone, value: formatPhoneDisplay(phoneE164), icon: Phone },
    email && { href: `mailto:${email}`, label: t.channels.email, value: email, icon: Mail },
    telegram && { href: `https://t.me/${telegram}`, label: t.channels.telegram, value: `@${telegram}`, icon: MessageCircle },
  ].filter((c): c is { href: string; label: string; value: string; icon: typeof Phone } => Boolean(c));

  return (
    <>
      <PageHero eyebrow={t.hero.eyebrow} title={t.hero.title} lead={t.hero.lead} />

      <Section tone="sunken" labelledBy="steps-heading">
        <SectionHeading id="steps-heading" eyebrow={t.steps.eyebrow} title={t.steps.title} className="mb-10" />
        <ol className="grid gap-6 md:grid-cols-3">
          {t.steps.items.map((s, i) => (
            <li key={s.title} className="grid content-start gap-3 rounded-card border border-border bg-surface p-6">
              <span className="grid size-10 place-items-center rounded-full bg-ink font-semibold text-bg">{i + 1}</span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="form-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="grid content-start gap-8">
            <SectionHeading id="form-heading" title={t.form.title} lead={t.form.lead} />

            {channels.length > 0 && (
              <div className="grid gap-3">
                <h3 className="text-base font-semibold">{t.channels.title}</h3>
                <ul className="grid gap-2">
                  {channels.map((c) => (
                    <li key={c.href}>
                      <a
                        href={c.href}
                        className="flex min-h-11 items-center gap-3 rounded-input border border-border bg-surface px-4 py-2 transition-colors duration-150 hover:border-ink/40"
                        {...(c.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        <c.icon className="size-5 shrink-0 text-muted" aria-hidden />
                        <span className="grid">
                          <span className="text-sm text-muted">{c.label}</span>
                          <span className="font-medium">{c.value}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-3 rounded-card bg-sunken p-5">
              <h3 className="text-base font-semibold">{t.parents.title}</h3>
              <p className="text-sm text-muted">{t.parents.body}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={localePath(locale, "/find-my-photos")}>{t.parents.findPhotos}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={shopSignInUrl(locale)}>{t.parents.signIn}</a>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-muted">{t.studio.title}</span>
              <a href={studioLoginUrl(locale)} className="inline-flex min-h-11 items-center gap-1.5 font-medium underline underline-offset-4 hover:no-underline">
                <LogIn className="size-4" aria-hidden /> {t.studio.login}
              </a>
            </div>
          </div>

          <div className="rounded-card border border-border bg-surface p-6 md:p-8">
            <PartnerForm />
          </div>
        </div>
      </Section>
    </>
  );
}
