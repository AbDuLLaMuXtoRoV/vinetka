import type { Metadata } from "next";
import { getLocale } from "@studio/lib/i18n";
import { jobMarketingMsgs } from "@studio/messages/job-marketing";
import { getSession, load } from "@studio/lib/api";
import { getJob } from "@studio/lib/queries";
import { MessagesClient } from "./messages-client";

export async function generateMetadata(): Promise<Metadata> {
  return { title: jobMarketingMsgs[await getLocale()].metaTitle };
}

export default async function JobMarketingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ member }, job, messages] = await Promise.all([getSession(), getJob(id), load((c) => c.jobs.messages(id))]);
  return <MessagesClient job={job} messages={messages} defaultTestTo={member.email} />;
}
