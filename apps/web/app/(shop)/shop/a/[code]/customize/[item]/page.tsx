import { normalizeCode } from "@snapbell/sdk";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Customizer } from "@shop/components/customizer";
import { LoadErrorView } from "@shop/components/load-error";
import { getAlbum, getCart, getShop } from "@shop/lib/api";
import { getLocale } from "@shop/lib/i18n";
import { metaMsgs } from "@shop/messages/meta";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].customize };
}

export default async function CustomizePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string; item: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const sp = await searchParams;
  const code = normalizeCode(p.code);
  const [album, shop] = await Promise.all([getAlbum(code), getShop(code)]);
  if (!album.ok) return <LoadErrorView error={album.error} code={code} />;
  if (!shop.ok) return <LoadErrorView error={shop.error} code={code} />;

  const product = shop.data.products.find((x) => x.id === p.item);
  if (!product || product.slots === 0) notFound();

  // ?edit=<cartItemId> reopens a customized cart line.
  const editId = typeof sp.edit === "string" ? sp.edit : null;
  const editing = editId ? ((await getCart())?.items.find((i) => i.id === editId && i.refId === product.id) ?? null) : null;
  const photo = typeof sp.photo === "string" && album.data.photos.some((x) => x.id === sp.photo) ? sp.photo : null;

  return <Customizer album={album.data} product={product} initialPhotoId={photo} editing={editing} />;
}
