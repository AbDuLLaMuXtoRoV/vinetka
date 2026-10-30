import { LegalPage, legalMetadata } from "@/components/legal-page";
import { getLocale } from "@/lib/i18n";

export const generateMetadata = legalMetadata("biometrics");

export default async function BiometricsPage({ params }: PageProps<"/[locale]/biometrics">) {
  return <LegalPage locale={await getLocale(params)} docKey="biometrics" />;
}
