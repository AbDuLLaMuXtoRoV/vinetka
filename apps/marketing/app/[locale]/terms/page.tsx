import { LegalPage, legalMetadata } from "@/components/legal-page";
import { getLocale } from "@/lib/i18n";

export const generateMetadata = legalMetadata("terms");

export default async function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  return <LegalPage locale={await getLocale(params)} docKey="terms" />;
}
