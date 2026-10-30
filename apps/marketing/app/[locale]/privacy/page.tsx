import { LegalPage, legalMetadata } from "@/components/legal-page";
import { getLocale } from "@/lib/i18n";

export const generateMetadata = legalMetadata("privacy");

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  return <LegalPage locale={await getLocale(params)} docKey="privacy" />;
}
