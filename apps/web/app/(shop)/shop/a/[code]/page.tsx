import { normalizeCode } from "@snapbell/sdk";
import type { Metadata } from "next";
import { AlbumGrid } from "@shop/components/album-grid";
import { AlbumHeader } from "@shop/components/album-header";
import { LoadErrorView } from "@shop/components/load-error";
import { getAlbum } from "@shop/lib/api";
import { getLocale } from "@shop/lib/i18n";
import { metaMsgs } from "@shop/messages/meta";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].album };
}

export default async function AlbumPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const res = await getAlbum(code);
  if (!res.ok) return <LoadErrorView error={res.error} code={code} />;
  const album = res.data;

  return (
    <div className="mx-auto grid max-w-content gap-4 px-4 pt-4 pb-28 md:pb-24">
      <AlbumHeader album={album} />
      <AlbumGrid
        code={code}
        photos={album.photos}
        filters={album.filters}
        initialFavorites={album.favorites}
        protection={album.job.protection}
        state={album.state}
        childName={album.subject?.firstName ?? null}
        findMeAvailable={album.findMeAvailable}
      />
    </div>
  );
}
