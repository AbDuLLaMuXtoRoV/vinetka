import { formatBps, formatters, type CartTotals, type Locale, type OrderSplit } from "@snapbell/sdk";
import { cn } from "../../lib/cn";
import { uiMessages } from "../../lib/messages";

/**
 * Totals block for cart, checkout and order pages (`mode="customer"`), or the
 * full money flow for the studio's order detail (`mode="studio"`).
 */
export function PriceBreakdown({
  totals,
  mode = "customer",
  promoCode,
  locale = "en",
  className,
}: {
  totals: CartTotals | OrderSplit;
  mode?: "customer" | "studio";
  promoCode?: string | null;
  locale?: Locale;
  className?: string;
}) {
  const t = uiMessages[locale].price;
  const { money } = formatters(locale);
  const row = (label: string, cents: number, opts: { negative?: boolean; strong?: boolean; muted?: boolean; free?: boolean } = {}) => (
    <div className={cn("flex justify-between gap-4", opts.strong && "border-t border-border pt-3 text-base font-semibold", opts.muted && "text-muted")}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{opts.free && cents === 0 ? t.free : `${opts.negative && cents > 0 ? "−" : ""}${money(cents)}`}</dd>
    </div>
  );

  return (
    <dl className={cn("grid gap-2 text-sm", className)}>
      {row(t.subtotal, totals.subtotalCents)}
      {totals.discountCents > 0 && row(promoCode ? t.discountCode(promoCode) : t.discount, totals.discountCents, { negative: true })}
      {row(t.shipping, totals.shippingCents, { free: true })}
      {row(t.tax, totals.taxCents)}
      {row(t.total, totals.totalCents, { strong: true })}
      {totals.passCreditCents > 0 && (
        <>
          {row(t.passCredit, totals.passCreditCents, { negative: true })}
          {row(mode === "customer" ? t.dueToday : t.chargedToCard, totals.chargedCents, { strong: true })}
        </>
      )}
      {mode === "studio" && "studioPayoutCents" in totals && (
        <div className="mt-3 grid gap-2 rounded-input bg-sunken p-3">
          {row(t.labCost, totals.labCostCents, { negative: true, muted: true })}
          {row(t.platformFee(formatBps(totals.platformFeeBps)), totals.platformFeeCents, { negative: true, muted: true })}
          {row(t.cardProcessing, totals.cardFeeCents, { negative: true, muted: true })}
          {row(t.taxRemittance, totals.taxCents, { negative: true, muted: true })}
          {row(t.payout, totals.studioPayoutCents, { strong: true })}
        </div>
      )}
    </dl>
  );
}
