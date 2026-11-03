import { LegalPage, legalMetadata } from "@site/components/legal-page";
import { getLocale } from "@site/lib/i18n";

export const generateMetadata = legalMetadata("terms-parents");

export default async function TermsParentsPage({ params }: PageProps<"/[locale]/terms-parents">) {
  return <LegalPage locale={await getLocale(params)} docKey="terms-parents" />;
}
