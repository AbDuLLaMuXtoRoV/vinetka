import { normalizeCode } from "@snapbell/sdk";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoadErrorView } from "@shop/components/load-error";
import { PhotoViewer } from "@shop/components/photo-viewer";
import { getAlbum } from "@shop/lib/api";
import { getLocale } from "@shop/lib/i18n";
import { metaMsgs } from "@shop/messages/meta";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].photo };
}

export default async function PhotoPage({ params }: { params: Promise<{ code: string; id: string }> }) {
  const p = await params;
  const code = normalizeCode(p.code);
  const res = await getAlbum(code);
  if (!res.ok) return <LoadErrorView error={res.error} code={code} />;
  const index = res.data.photos.findIndex((ph) => ph.id === p.id);
  if (index < 0) notFound();

  return (
    <PhotoViewer
      code={code}
      photos={res.data.photos}
      initialIndex={index}
      initialFavorites={res.data.favorites}
      protection={res.data.job.protection}
    />
  );
}
