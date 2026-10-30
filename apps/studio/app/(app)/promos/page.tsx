import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { load, requireRole } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { promosMsgs } from "@/messages/promos";
import { PromosClient } from "./promos-client";

export async function generateMetadata(): Promise<Metadata> {
  return { title: promosMsgs[await getLocale()].title };
}

export default async function PromosPage() {
  await requireRole(["owner", "admin"]);
  const t = promosMsgs[await getLocale()];
  const [promos, offers, jobs] = await Promise.all([load((c) => c.promos.list()), load((c) => c.promos.passOffers()), load((c) => c.jobs.list())]);
  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <PromosClient promos={promos} offers={offers} jobs={jobs.map((j) => ({ id: j.id, name: `${j.organizationName} · ${j.name}`, date: j.date, status: j.status }))} />
    </>
  );
}
