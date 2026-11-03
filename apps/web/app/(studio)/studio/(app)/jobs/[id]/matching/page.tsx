import type { Metadata } from "next";
import { getLocale } from "@studio/lib/i18n";
import { matchingMsgs } from "@studio/messages/matching";
import { load } from "@studio/lib/api";
import { getSubjects } from "@studio/lib/queries";
import { MatchingClient } from "./matching-client";

export async function generateMetadata(): Promise<Metadata> {
  return { title: matchingMsgs[await getLocale()].metaTitle };
}

export default async function MatchingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [queue, subjects] = await Promise.all([load((c) => c.matches.queue(id)), getSubjects(id)]);
  return <MatchingClient jobId={id} queue={queue} subjects={subjects} />;
}
