import type { Metadata } from "next";
import { CheckList } from "@/components/blocks";
import { SignupForm } from "@/components/forms/signup-form";
import { env } from "@/lib/env";
import { getLocale, pageMetadata, withLang } from "@/lib/i18n";
import { signupMsgs } from "@/messages/pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/signup">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/signup", signupMsgs[locale].meta);
}

export default async function SignupPage({ params }: PageProps<"/[locale]/signup">) {
  const locale = await getLocale(params);
  const t = signupMsgs[locale];
  return (
    <section className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto grid max-w-content gap-12 lg:grid-cols-[1fr_28rem] lg:items-start">
        <div className="grid content-start gap-6">
          <h1 className="font-display text-3xl text-balance lg:text-4xl">{t.title}</h1>
          <p className="max-w-xl text-lg text-muted">{t.lead}</p>
          <CheckList items={t.perks} />
        </div>
        <div className="rounded-card border border-border bg-surface p-6 md:p-8">
          <h2 className="mb-6 text-xl font-semibold">{t.formTitle}</h2>
          <SignupForm googleUrl={withLang(`${env.studioUrl}/login?provider=google`, locale)} loginUrl={withLang(`${env.studioUrl}/login`, locale)} />
        </div>
      </div>
    </section>
  );
}
