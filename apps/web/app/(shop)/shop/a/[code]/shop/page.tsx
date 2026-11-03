import { normalizeCode } from "@snapbell/sdk";
import type { Metadata } from "next";
import { LoadErrorView } from "@shop/components/load-error";
import { ShopView } from "@shop/components/shop-view";
import { getAlbum, getShop } from "@shop/lib/api";
import { getLocale } from "@shop/lib/i18n";
import { metaMsgs } from "@shop/messages/meta";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].shop };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const code = normalizeCode((await params).code);
  const sp = await searchParams;
  const [album, shop] = await Promise.all([getAlbum(code), getShop(code)]);
  if (!album.ok) return <LoadErrorView error={album.error} code={code} />;
  if (!shop.ok) return <LoadErrorView error={shop.error} code={code} />;

  const preselect = typeof sp.photo === "string" && album.data.photos.some((p) => p.id === sp.photo) ? sp.photo : null;

  return (
    <div className="mx-auto max-w-content px-4 pt-4 pb-12">
      <ShopView album={album.data} shop={shop.data} preselectedPhotoId={preselect} />
    </div>
  );
}
