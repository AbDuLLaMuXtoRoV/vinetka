import { DataRequestForm } from "@/components/forms/simple-forms";
import { LegalPage, legalMetadata } from "@/components/legal-page";
import { getLocale } from "@/lib/i18n";
import { contentMsgs } from "@/messages/content";

export const generateMetadata = legalMetadata("data-request");

export default async function DataRequestPage({ params }: PageProps<"/[locale]/data-request">) {
  const locale = await getLocale(params);
  return (
    <LegalPage locale={locale} docKey="data-request">
      <section aria-labelledby="request-heading" className="grid gap-4 rounded-card border border-border bg-surface p-6 md:p-8">
        <h2 id="request-heading" className="text-xl font-semibold">
          {contentMsgs[locale].legal.makeRequest}
        </h2>
        <DataRequestForm />
      </section>
    </LegalPage>
  );
}
