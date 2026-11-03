import type { Contact, Shop } from "@snapbell/sdk";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@shop/components/checkout-form";
import { getCart, getShop, load } from "@shop/lib/api";
import { getLocale } from "@shop/lib/i18n";
import { metaMsgs } from "@shop/messages/meta";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].checkout };
}

export default async function CheckoutPage() {
  const cart = await getCart();
  if (!cart || cart.items.length === 0) redirect("/shop/cart");

  const [account, shop] = await Promise.all([load((c) => c.account.get()), getShop(cart.items[0]!.albumCode)]);
  const parent = account.ok ? account.data.parent : null;
  const contact: Contact = { name: parent?.name ?? "", email: parent?.email ?? "", phone: parent?.phone ?? null };
  const shippingOptions: Shop["shippingOptions"] = shop.ok
    ? shop.data.shippingOptions
    : [{ method: "home", label: "Ship to home", priceCents: cart.totals.shippingCents }];

  return (
    <div className="mx-auto max-w-content px-4 pt-4 pb-12">
      <CheckoutForm cart={cart} initialContact={contact} shippingOptions={shippingOptions} />
    </div>
  );
}
