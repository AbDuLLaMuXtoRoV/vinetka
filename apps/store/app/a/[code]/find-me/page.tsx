import { normalizeCode } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { EmptyState } from "@snapbell/ui/feedback";
import { ScanFace } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FindMe } from "@/components/find-me";
import { LoadErrorView } from "@/components/load-error";
import { getAlbum } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { metaMsgs } from "@/messages/meta";
import { serverMsgs } from "@/messages/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].findMe };
}

export default async function FindMePage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const res = await getAlbum(code);
  if (!res.ok) return <LoadErrorView error={res.error} code={code} />;
  const album = res.data;
  const t = serverMsgs[await getLocale()].findMe;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-12">
      {album.findMeAvailable && album.job.albumType !== "personal" ? (
        <FindMe code={code} studioName={album.studio.name} tags={album.filters.tags} />
      ) : (
        <EmptyState
          icon={<ScanFace />}
          title={t.unavailableTitle}
          description={t.unavailableBody}
          action={
            <Button asChild>
              <Link href={`/a/${code}`}>{t.back}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
