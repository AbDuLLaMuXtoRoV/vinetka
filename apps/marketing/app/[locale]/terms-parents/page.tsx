import { LegalPage, legalMetadata } from "@/components/legal-page";
import { getLocale } from "@/lib/i18n";

export const generateMetadata = legalMetadata("terms-parents");

export default async function TermsParentsPage({ params }: PageProps<"/[locale]/terms-parents">) {
  return <LegalPage locale={await getLocale(params)} docKey="terms-parents" />;
}
