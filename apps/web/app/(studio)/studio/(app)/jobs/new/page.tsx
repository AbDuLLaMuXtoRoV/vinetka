import type { Metadata } from "next";
import { PageHeader } from "@studio/components/page-header";
import { getSession, load } from "@studio/lib/api";
import { getLocale } from "@studio/lib/i18n";
import { jobsMsgs } from "@studio/messages/jobs";
import { NewJobForm } from "./new-job-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: jobsMsgs[await getLocale()].create.title };
}

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const { studio } = await getSession();
  const t = jobsMsgs[await getLocale()];
  const [organizations, priceSheets] = await Promise.all([load((c) => c.organizations.list()), load((c) => c.priceSheets.list())]);
  return (
    <>
      <PageHeader title={t.create.title} description={t.create.description} back={{ href: "/studio/jobs", label: t.header.back }} />
      <NewJobForm
        studio={{ name: studio.name, logoUrl: studio.logoUrl, brandColor: studio.brandColor }}
        markets={studio.markets}
        clientNames={[...new Set(organizations.map((o) => o.name))].sort((a, b) => a.localeCompare(b))}
        priceSheets={priceSheets.filter((p) => !p.archived)}
        defaultClientName={client}
      />
    </>
  );
}
