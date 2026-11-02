import type { Metadata } from "next";
import { ParentAuthForm } from "@/components/account/parent-auth-form";
import { getLocale, pageMetadata } from "@/lib/i18n";
import { accountMsgs } from "@/messages/account";

export async function generateMetadata({ params }: PageProps<"/[locale]/signup">): Promise<Metadata> {
  const locale = await getLocale(params);
  // Account pages are for people, not search results.
  return pageMetadata(locale, "/signup", accountMsgs[locale].meta.signup, { robots: { index: false, follow: true } });
}

export default async function ParentAccountPage({ params }: PageProps<"/[locale]/signup">) {
  await getLocale(params);
  return (
    <section className="px-4 py-12 md:px-6 md:py-20">
      <div className="mx-auto w-full max-w-md rounded-card border border-border bg-surface p-6 md:p-8">
        <ParentAuthForm mode="signup" />
      </div>
    </section>
  );
}
