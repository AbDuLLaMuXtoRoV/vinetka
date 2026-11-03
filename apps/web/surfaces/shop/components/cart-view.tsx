"use client";

import type { Cart, CartItem, CartItemInput } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { PriceBreakdown } from "@snapbell/ui/commerce/price-breakdown";
import { Alert } from "@snapbell/ui/feedback";
import { Input } from "@snapbell/ui/input";
import { useFormatters, useLocale, useMessages } from "@snapbell/ui/locale";
import { Lock, Minus, Pencil, Plus, Tag, Ticket, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { updateCart, updateCartItems } from "@shop/actions";
import { cartMsgs } from "@shop/messages/cart";

function toInput(i: CartItem): CartItemInput {
  return { id: i.id, kind: i.kind, refId: i.refId, quantity: i.quantity, albumCode: i.albumCode, subjectId: i.subjectId, photoIds: i.photoIds, customization: i.customization };
}

/** Screen 8: items grouped by child, quantity/remove, promo code, Pass credit and totals. */
export function CartView({ cart: initial, thumbs }: { cart: Cart; thumbs: Record<string, string> }) {
  const locale = useLocale();
  const t = useMessages(cartMsgs);
  const fmt = useFormatters();
  const [cart, setCart] = useState(initial);
  const [promo, setPromo] = useState(initial.promoCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const groups = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const item of cart.items) map.set(item.subjectName, [...(map.get(item.subjectName) ?? []), item]);
    return [...map.entries()];
  }, [cart.items]);

  const saveItems = (items: CartItemInput[]) => {
    setError(null);
    start(async () => {
      const res = await updateCartItems(items);
      if (res.ok) setCart(res.data);
      else setError(res.message);
    });
  };

  const setQty = (id: string, quantity: number) =>
    saveItems(cart.items.map((i) => (i.id === id ? { ...toInput(i), quantity } : toInput(i))).filter((i) => i.quantity > 0));

  const applyPromo = (code: string | null) => {
    setError(null);
    start(async () => {
      const res = await updateCart({ promoCode: code });
      if (res.ok) {
        setCart(res.data);
        if (!code) setPromo("");
      } else setError(res.message);
    });
  };

  if (cart.items.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 py-16 text-center">
        <p className="text-lg font-semibold">{t.empty}</p>
        <Button asChild>
          <Link href="/shop">{t.backToPhotos}</Link>
        </Button>
      </div>
    );
  }

  const count = cart.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="grid gap-6">
        <h1 className="text-xl font-semibold md:text-2xl">
          {t.title} <span className="text-base font-normal text-muted">({t.items(count)})</span>
        </h1>
        {error && <Alert tone="danger">{error}</Alert>}
        {groups.map(([child, items]) => (
          <section key={child} aria-label={t.itemsFor(child)} className="grid gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{child}</h2>
            <ul className="divide-y divide-border rounded-card border border-border bg-surface">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 p-4">
                  <div className="flex shrink-0 -space-x-6">
                    {item.photoIds.slice(0, 3).map((id) =>
                      thumbs[id] ? (
                        <img key={id} src={thumbs[id]} alt="" draggable={false} className="no-save h-20 w-16 rounded-input border-2 border-surface object-cover" />
                      ) : (
                        <span key={id} className="h-20 w-16 rounded-input bg-sunken" aria-hidden />
                      ),
                    )}
                  </div>
                  <div className="grid min-w-0 flex-1 gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        {item.customization && (
                          <p className="truncate text-xs text-muted">
                            {t.customized}
                            {item.customization.nameText ? ` · «${item.customization.nameText}»` : ""}
                            {item.customization.retouch ? ` · ${t.retouch}` : ""}
                          </p>
                        )}
                        {item.photoIds.length > 3 && <p className="text-xs text-muted">{t.photos(item.photoIds.length)}</p>}
                      </div>
                      <p className="font-medium tabular-nums">{fmt.money(item.unitPriceCents * item.quantity)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center rounded-input border border-border" role="group" aria-label={t.quantityOf(item.name)}>
                        <button type="button" className="grid size-10 place-items-center disabled:opacity-40" disabled={pending} onClick={() => setQty(item.id, item.quantity - 1)} aria-label={t.decrease}>
                          <Minus className="size-4" aria-hidden />
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums">{item.quantity}</span>
                        <button type="button" className="grid size-10 place-items-center disabled:opacity-40" disabled={pending} onClick={() => setQty(item.id, item.quantity + 1)} aria-label={t.increase}>
                          <Plus className="size-4" aria-hidden />
                        </button>
                      </div>
                      {item.customization && item.kind === "product" && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/shop/a/${item.albumCode}/customize/${item.refId}?edit=${item.id}`}>
                            <Pencil aria-hidden /> {t.edit}
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setQty(item.id, 0)} aria-label={t.removeItem(item.name)}>
                        <Trash2 aria-hidden /> {t.remove}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-sm text-muted">
          {t.siblings}
        </p>
      </div>

      <aside className="grid gap-5 rounded-card border border-border bg-surface p-5 lg:sticky lg:top-20">
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (promo.trim()) applyPromo(promo.trim().toUpperCase());
          }}
        >
          <label htmlFor="promo" className="flex items-center gap-2 text-sm font-medium">
            <Tag className="size-4" aria-hidden /> {t.promo}
          </label>
          {cart.promoCode && !cart.promoError ? (
            <div className="flex items-center justify-between rounded-input bg-success/10 px-3 py-2 text-sm">
              <span>
                <strong>{cart.promoCode}</strong>
                {t.promoApplied}
              </span>
              <button type="button" className="text-muted underline underline-offset-4" onClick={() => applyPromo(null)}>
                {t.promoRemove}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id="promo"
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                autoCapitalize="characters"
                placeholder={t.promoPlaceholder}
                aria-invalid={cart.promoError ? true : undefined}
                aria-describedby={cart.promoError ? "promo-error" : undefined}
              />
              <Button type="submit" variant="outline" disabled={!promo.trim() || pending}>
                {t.apply}
              </Button>
            </div>
          )}
          {cart.promoError && (
            <p id="promo-error" role="alert" className="text-xs text-danger">
              {cart.promoError}
            </p>
          )}
        </form>

        {cart.totals.passCreditCents > 0 && (
          <p className="flex items-center gap-2 rounded-input bg-sage/15 px-3 py-2 text-sm">
            <Ticket className="size-4 text-sage" aria-hidden />
            {t.passApplied}
          </p>
        )}

        <PriceBreakdown totals={cart.totals} promoCode={cart.promoCode} locale={locale} />
        <p className="-mt-2 text-xs text-muted">
          {cart.deliveryMethod === "school_pickup" ? t.schoolFree : t.homeEstimate}
          {t.taxNote}
        </p>

        <Button asChild size="lg" block aria-disabled={pending}>
          <Link href="/shop/checkout">
            <Lock aria-hidden /> {t.checkout(fmt.money(cart.totals.chargedCents))}
          </Link>
        </Button>
      </aside>
    </div>
  );
}
