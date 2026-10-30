import { Button } from "@snapbell/ui/button";
import { EmptyState } from "@snapbell/ui/feedback";
import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CartView } from "@/components/cart-view";
import { photoThumbs } from "@/lib/thumbs";
import { getCart, lastAlbumCode } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { metaMsgs } from "@/messages/meta";
import { serverMsgs } from "@/messages/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].cart };
}

export default async function CartPage() {
  const [cart, code] = await Promise.all([getCart(), lastAlbumCode()]);

  if (!cart || cart.items.length === 0) {
    const t = serverMsgs[await getLocale()].cart;
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <EmptyState
          icon={<ShoppingCart />}
          title={t.emptyTitle}
          description={t.emptyBody}
          action={
            <Button asChild>
              <Link href={code ? `/a/${code}/shop` : "/"}>{code ? t.shop : t.enterCode}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const thumbs = await photoThumbs(cart.items.map((i) => i.albumCode));
  return (
    <div className="mx-auto max-w-content px-4 pt-4 pb-12">
      <CartView cart={cart} thumbs={thumbs} />
    </div>
  );
}
