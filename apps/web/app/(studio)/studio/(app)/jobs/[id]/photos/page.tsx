import type { Metadata } from "next";
import { getLocale } from "@studio/lib/i18n";
import { photosMsgs } from "@studio/messages/photos";
import { load } from "@studio/lib/api";
import { PhotoGrid } from "./photo-grid";
import { Uploader } from "./uploader";

export async function generateMetadata(): Promise<Metadata> {
  return { title: photosMsgs[await getLocale()].metaTitle };
}

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photos = await load((c) => c.photos.list(id));
  return (
    <div className="grid gap-8">
      <Uploader jobId={id} />
      <PhotoGrid jobId={id} photos={photos} />
    </div>
  );
}
