import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { jobOrdersMsgs } from "@/messages/job-orders";
import { load } from "@/lib/api";
import { getJob } from "@/lib/queries";
import { JobOrdersClient } from "./job-orders-client";

export async function generateMetadata(): Promise<Metadata> {
  return { title: jobOrdersMsgs[await getLocale()].metaTitle };
}

export default async function JobOrdersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, orders, batches] = await Promise.all([getJob(id), load((c) => c.jobs.orders(id)), load((c) => c.jobs.bulkBatches(id))]);
  return <JobOrdersClient job={job} orders={orders} batches={batches} />;
}
