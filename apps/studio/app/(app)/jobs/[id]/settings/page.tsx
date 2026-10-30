import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { jobSettingsMsgs } from "@/messages/job-settings";
import { load } from "@/lib/api";
import { getJob } from "@/lib/queries";
import { JobSettingsForm } from "./settings-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: jobSettingsMsgs[await getLocale()].metaTitle };
}

export default async function JobSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, priceSheets] = await Promise.all([getJob(id), load((c) => c.priceSheets.list())]);
  return <JobSettingsForm job={job} priceSheets={priceSheets.filter((p) => !p.archived || p.id === job.priceSheetId)} />;
}
