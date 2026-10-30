import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { exportsMsgs } from "@/messages/job-orders";
import { getSession, load } from "@/lib/api";
import { ExportsClient } from "./exports-client";

export async function generateMetadata(): Promise<Metadata> {
  return { title: exportsMsgs[await getLocale()].metaTitle };
}

export default async function ExportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ member }, exports, photos] = await Promise.all([getSession(), load((c) => c.jobs.exports(id)), load((c) => c.photos.list(id))]);
  const labels = [...new Set(photos.flatMap((p) => p.labels))].sort();
  return <ExportsClient jobId={id} exports={exports} labels={labels.length ? labels : ["Yearbook", "ID card"]} email={member.email} />;
}
