import { getAlbum } from "@/lib/api";

/** photoId → signed thumbnail URL for every album referenced by the cart or an order. */
export async function photoThumbs(albumCodes: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(albumCodes)];
  const albums = await Promise.all(unique.map((c) => getAlbum(c)));
  const out: Record<string, string> = {};
  for (const a of albums) {
    if (a.ok) for (const p of a.data.photos) out[p.id] = p.thumbUrl;
  }
  return out;
}
