"use client";

import type { Album, ProductCategory, Shop, ShopPackage, ShopProduct } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Card } from "@snapbell/ui/card";
import { Alert, EmptyState } from "@snapbell/ui/feedback";
import { useFormatters, useMessages } from "@snapbell/ui/locale";
import { useToast } from "@snapbell/ui/toast";
import { Check, Download, Heart, PackageOpen, Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { addToCart, type NewCartItem } from "@/app/actions";
import { track } from "@/lib/analytics";
import { shopMsgs } from "@/messages/shop";
import { PhotoPicker } from "./photo-picker";

const CATEGORY_ORDER: ProductCategory[] = ["print", "keepsake", "group", "digital"];

type Picking = { kind: "package"; item: ShopPackage } | { kind: "product"; item: ShopProduct } | null;

/** Screen 6: suggested bundle from favorites, packages, then single products. */
export function ShopView({ album, shop, preselectedPhotoId }: { album: Album; shop: Shop; preselectedPhotoId: string | null }) {
  const toast = useToast();
  const t = useMessages(shopMsgs);
  const fmt = useFormatters();
  const [picking, setPicking] = useState<Picking>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const code = album.code;
  const defaultPhotos = preselectedPhotoId
    ? [preselectedPhotoId, ...album.favorites.filter((f) => f !== preselectedPhotoId)]
    : album.favorites.length
      ? album.favorites
      : album.photos.map((p) => p.id);

  const base = (): Pick<NewCartItem, "albumCode" | "subjectId" | "customization" | "quantity"> => ({
    albumCode: code,
    subjectId: album.subject?.id ?? null,
    customization: null,
    quantity: 1,
  });

  const add = (item: NewCartItem, then?: "checkout" | "cart") => {
    setError(null);
    start(async () => {
      const res = await addToCart(item, then ? { then } : {});
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setPicking(null);
      toast({
        title: t.added,
        description: res.data.newCart ? t.newCart : (
          <Link href="/cart" className="underline underline-offset-4">
            {t.viewCart(res.data.count)}
          </Link>
        ),
        tone: "success",
      });
    });
  };

  const suggested = shop.suggestedBundle ? shop.packages.find((p) => p.id === shop.suggestedBundle!.packageId) : null;
  const featured = suggested ?? shop.packages.find((p) => p.featured) ?? shop.packages[0] ?? null;
  const bundlePhotos = shop.suggestedBundle?.photoIds.length ? shop.suggestedBundle.photoIds : defaultPhotos;
  const photoById = new Map(album.photos.map((p) => [p.id, p]));

  const byCategory = CATEGORY_ORDER.map((c) => ({ category: c, items: shop.products.filter((p) => p.category === c) })).filter((g) => g.items.length);
  const allPhotoIds = album.photos.map((p) => p.id);

  if (!shop.packages.length && !shop.products.length) {
    return <EmptyState icon={<PackageOpen />} title={t.emptyTitle} description={t.emptyBody} />;
  }

  return (
    <div className="grid gap-10">
      <header className="grid gap-1">
        <h1 className="text-xl font-semibold md:text-2xl">{t.title(album.subject?.firstName ?? null)}</h1>
        <p className="text-sm text-muted">{t.subtitle(album.job.shipping.schoolPickup)}</p>
      </header>

      {error && <Alert tone="danger">{error}</Alert>}

      {featured && (
        <section aria-labelledby="bundle-title" className="overflow-hidden rounded-card border-2 border-accent bg-surface">
          <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
            <div className="grid gap-3">
              <Badge tone="accent" className="w-fit">
                {shop.suggestedBundle ? <Heart aria-hidden /> : <Sparkles aria-hidden />}
                {shop.suggestedBundle ? t.fromFavorites : t.mostPopular}
              </Badge>
              <div>
                <h2 id="bundle-title" className="text-lg font-semibold">
                  {featured.name}
                </h2>
                <p className="text-sm text-muted">{featured.description}</p>
              </div>
              <ul className="grid gap-1 text-sm">
                {featured.contents.map((c) => (
                  <li key={c} className="flex items-center gap-2">
                    <Check className="size-4 text-success" aria-hidden />
                    {c}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2" aria-label={t.bundlePhotos}>
                {bundlePhotos.slice(0, Math.max(1, featured.slots)).map((id) => {
                  const p = photoById.get(id);
                  return p ? <img key={id} src={p.thumbUrl} alt="" draggable={false} className="no-save h-20 w-16 rounded-input object-cover" /> : null;
                })}
              </div>
            </div>
            <div className="grid gap-2 md:w-60">
              <p className="text-2xl font-semibold tabular-nums">
                {fmt.money(featured.priceCents)}
                {featured.savingsCents > 0 && <span className="ml-2 align-middle text-sm font-medium text-success">{t.save(fmt.money(featured.savingsCents))}</span>}
              </p>
              <Button
                size="lg"
                block
                loading={pending && !picking}
                onClick={() => {
                  track("bundle_added", { packageId: featured.id, suggested: !!shop.suggestedBundle });
                  add({ ...base(), kind: "package", refId: featured.id, photoIds: bundlePhotos.slice(0, Math.max(1, featured.slots)) }, "checkout");
                }}
              >
                {t.buyBundle}
              </Button>
              <Button variant="ghost" block onClick={() => setPicking({ kind: "package", item: featured })}>
                {t.differentPhotos}
              </Button>
            </div>
          </div>
        </section>
      )}

      {shop.packages.length > 0 && (
        <section aria-labelledby="packages-title" className="grid gap-4">
          <h2 id="packages-title" className="text-lg font-semibold">
            {t.packages}
          </h2>
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {shop.packages.map((pkg) => (
              <li key={pkg.id}>
                <Card className="grid h-full gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{pkg.name}</h3>
                      <p className="text-sm text-muted">{pkg.description}</p>
                    </div>
                    {pkg.featured && <Badge tone="accent">{t.popular}</Badge>}
                  </div>
                  <ul className="grid gap-1 text-sm">
                    {pkg.contents.map((c) => (
                      <li key={c} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-success" aria-hidden />
                        {c}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <p className="font-semibold tabular-nums">
                      {fmt.money(pkg.priceCents)}
                      {pkg.savingsCents > 0 && <span className="block text-xs font-medium text-success">{t.save(fmt.money(pkg.savingsCents))}</span>}
                    </p>
                    <Button variant="secondary" onClick={() => setPicking({ kind: "package", item: pkg })}>
                      {t.choosePhoto}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {byCategory.map((group) => (
        <section key={group.category} aria-labelledby={`cat-${group.category}`} className="grid gap-4">
          <h2 id={`cat-${group.category}`} className="text-lg font-semibold">
            {t.categories[group.category]}
          </h2>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {group.items.map((product) => {
              const downloadAll = product.slots === 0;
              return (
                <li key={product.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="grid gap-0.5">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted tabular-nums">
                      {fmt.money(product.priceCents)}
                      {downloadAll ? t.allPhotos(album.photos.length) : t.each}
                    </p>
                  </div>
                  {downloadAll ? (
                    <Button
                      variant="outline"
                      loading={pending}
                      onClick={() => add({ ...base(), kind: "product", refId: product.id, photoIds: allPhotoIds })}
                    >
                      <Download aria-hidden /> {t.add}
                    </Button>
                  ) : product.customizable ? (
                    <Button variant="outline" asChild>
                      <Link href={`/a/${code}/customize/${product.id}${defaultPhotos[0] ? `?photo=${defaultPhotos[0]}` : ""}`}>
                        <WandSparkles aria-hidden /> {t.customize}
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setPicking({ kind: "product", item: product })}>
                      {t.add}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <PhotoPicker
        open={picking !== null}
        onOpenChange={(o) => !o && setPicking(null)}
        title={picking?.item.name ?? ""}
        photos={album.photos}
        slots={picking ? Math.max(1, picking.item.slots) : 1}
        initial={defaultPhotos}
        pending={pending}
        confirmLabel={picking ? t.addToCartPrice(fmt.money(picking.item.priceCents)) : t.addToCart}
        onConfirm={(photoIds) => {
          if (!picking) return;
          add({ ...base(), kind: picking.kind, refId: picking.item.id, photoIds });
        }}
      />
    </div>
  );
}
