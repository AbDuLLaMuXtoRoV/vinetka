import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { rosterMsgs } from "@/messages/roster";
import { getJob, getSubjects } from "@/lib/queries";
import { RosterClient } from "./roster-client";

export async function generateMetadata(): Promise<Metadata> {
  return { title: rosterMsgs[await getLocale()].metaTitle };
}

export default async function RosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, subjects] = await Promise.all([getJob(id), getSubjects(id)]);
  return <RosterClient job={job} subjects={subjects} />;
}
