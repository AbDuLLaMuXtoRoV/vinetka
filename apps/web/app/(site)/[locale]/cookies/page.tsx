import { LegalPage, legalMetadata } from "@site/components/legal-page";
import { getLocale } from "@site/lib/i18n";

export const generateMetadata = legalMetadata("cookies");

export default async function CookiesPage({ params }: PageProps<"/[locale]/cookies">) {
  return <LegalPage locale={await getLocale(params)} docKey="cookies" />;
}
