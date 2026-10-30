import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getSession, load } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { jobsMsgs } from "@/messages/jobs";
import { NewJobForm } from "./new-job-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: jobsMsgs[await getLocale()].create.title };
}

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ organizationId?: string }> }) {
  const { organizationId } = await searchParams;
  const { studio } = await getSession();
  const t = jobsMsgs[await getLocale()];
  const [organizations, priceSheets] = await Promise.all([load((c) => c.organizations.list()), load((c) => c.priceSheets.list())]);
  return (
    <>
      <PageHeader title={t.create.title} description={t.create.description} back={{ href: "/jobs", label: t.header.back }} />
      <NewJobForm
        studio={{ name: studio.name, logoUrl: studio.logoUrl, brandColor: studio.brandColor }}
        markets={studio.markets}
        organizations={organizations}
        priceSheets={priceSheets.filter((p) => !p.archived)}
        defaultOrganizationId={organizationId}
      />
    </>
  );
}
