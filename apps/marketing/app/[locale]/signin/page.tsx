import type { Metadata } from "next";
import { ParentAuthForm } from "@/components/account/parent-auth-form";
import { getLocale, pageMetadata } from "@/lib/i18n";
import { accountMsgs } from "@/messages/account";

export async function generateMetadata({ params }: PageProps<"/[locale]/signin">): Promise<Metadata> {
  const locale = await getLocale(params);
  // Account pages are for people, not search results.
  return pageMetadata(locale, "/signin", accountMsgs[locale].meta.signin, { robots: { index: false, follow: true } });
}

export default async function ParentAccountPage({ params }: PageProps<"/[locale]/signin">) {
  await getLocale(params);
  return (
    <section className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto w-full max-w-md rounded-card border border-border bg-surface p-6 md:p-8">
        <ParentAuthForm mode="signin" />
      </div>
    </section>
  );
}
