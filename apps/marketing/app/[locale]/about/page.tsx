import { Avatar } from "@snapbell/ui/avatar";
import { Building2, Mail, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/simple-forms";
import { PageHero, Section, SectionHeading } from "@/components/section";
import { getLocale, pageMetadata } from "@/lib/i18n";
import { COMPANY } from "@/lib/site";
import { aboutMsgs } from "@/messages/pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/about", aboutMsgs[locale].meta);
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const locale = await getLocale(params);
  const t = aboutMsgs[locale];
  return (
    <>
      <PageHero eyebrow={t.hero.eyebrow} title={t.hero.title} lead={t.hero.lead} />

      <Section tone="sunken" labelledBy="mission-heading">
        <div className="grid gap-10 lg:grid-cols-2">
          <SectionHeading id="mission-heading" eyebrow={t.mission.eyebrow} title={t.mission.title} />
          <div className="grid content-start gap-4 text-lg text-muted">
            {t.mission.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </Section>

      <Section labelledBy="team-heading">
        <SectionHeading id="team-heading" eyebrow={t.team.eyebrow} title={t.team.title} className="mb-10" />
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {t.team.people.map((p) => (
            <li key={p.name} className="grid content-start gap-3 rounded-card border border-border bg-surface p-6">
              <Avatar name={p.name} size={56} />
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-muted">{p.role}</p>
              </div>
              <p className="text-muted">{p.bio}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="contact" tone="sunken" labelledBy="contact-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="grid content-start gap-6">
            <SectionHeading id="contact-heading" eyebrow={t.contact.eyebrow} title={t.contact.title} lead={t.contact.lead} />
            <dl className="grid gap-4">
              <div className="flex gap-3">
                <dt>
                  <Mail className="size-5" aria-label={t.contact.email} />
                </dt>
                <dd>
                  <a href={`mailto:${COMPANY.email}`} className="underline underline-offset-4">
                    {COMPANY.email}
                  </a>
                </dd>
              </div>
              <div className="flex gap-3">
                <dt>
                  <MapPin className="size-5" aria-label={t.contact.address} />
                </dt>
                <dd>{COMPANY.address}</dd>
              </div>
              <div className="flex gap-3">
                <dt>
                  <Building2 className="size-5" aria-label={t.contact.company} />
                </dt>
                <dd>
                  {COMPANY.legalName} · {t.contact.corp}
                </dd>
              </div>
            </dl>
            <p className="text-sm text-muted">{t.contact.parents(COMPANY.supportEmail)}</p>
          </div>
          <div className="rounded-card border border-border bg-surface p-6 md:p-8">
            <ContactForm />
          </div>
        </div>
      </Section>
    </>
  );
}
