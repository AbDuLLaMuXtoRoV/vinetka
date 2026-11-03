import {
  PLATFORM_FEE_STANDARD_BPS,
  PLATFORM_FEE_VOLUME_BPS,
  SHIPPING_CENTS,
  VOLUME_TIER_THRESHOLD_CENTS,
  bps,
  formatters,
  splitOrder,
  yearlyPlatformFee,
  type Locale,
} from "@snapbell/sdk";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { ArrowRight } from "lucide-react";
import { pricingMsgs } from "@site/messages/pricing";

/** The two marginal tiers, with worked examples computed from the real fee function. */
export function PricingTable({ locale }: { locale: Locale }) {
  const t = pricingMsgs[locale].table;
  const fmt = formatters(locale);
  const pct = (b: number, digits = 0) => fmt.percent(b / 10_000, digits);
  const threshold = fmt.money(VOLUME_TIER_THRESHOLD_CENTS, { whole: true });
  const examples = [100_000_00, 250_000_00, 400_000_00];
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 rounded-card border-2 border-ink bg-surface p-6">
          <p className="text-sm font-semibold text-muted">{t.standard}</p>
          <p className="font-display text-4xl">{pct(PLATFORM_FEE_STANDARD_BPS)}</p>
          <p>{t.standardBody(threshold)}</p>
        </div>
        <div className="grid gap-2 rounded-card border border-border bg-surface p-6">
          <p className="text-sm font-semibold text-muted">{t.volume}</p>
          <p className="font-display text-4xl">{pct(PLATFORM_FEE_VOLUME_BPS)}</p>
          <p>{t.volumeBody(threshold)}</p>
        </div>
      </div>
      <Table>
        <caption className="px-4 pt-4 text-left text-sm text-muted">{t.caption}</caption>
        <THead>
          <tr>
            <TH>{t.yearlySales}</TH>
            <TH align="right">{t.platformFee}</TH>
            <TH align="right">{t.effectiveRate}</TH>
            <TH align="right">{t.monthlyFee}</TH>
          </tr>
        </THead>
        <TBody>
          {examples.map((sales) => {
            const fee = yearlyPlatformFee(sales);
            return (
              <TR key={sales}>
                <TD className="font-medium">{fmt.money(sales, { whole: true })}</TD>
                <TD align="right">{fmt.money(fee, { whole: true })}</TD>
                <TD align="right">{fmt.percent(fee / sales, 2)}</TD>
                <TD align="right">{fmt.money(0, { whole: true })}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}

/** "Parent pays → lab, fees, tax, studio" for one realistic order, to the cent. */
export function MoneyFlow({ locale }: { locale: Locale }) {
  const t = pricingMsgs[locale].flow;
  const { money, percent } = formatters(locale);
  const subtotal = 69_00;
  const shipping = SHIPPING_CENTS.home;
  const split = splitOrder({
    subtotalCents: subtotal,
    discountCents: 0,
    shippingCents: shipping,
    taxCents: bps(subtotal + shipping, 600),
    labCostCents: 7_30,
  });
  const parts = [
    { key: "payout", ...t.parts.payout, cents: split.studioPayoutCents, className: "bg-accent text-accent-ink" },
    { key: "lab", ...t.parts.lab, cents: split.labCostCents, className: "bg-sage text-white" },
    { key: "snapbell", label: t.parts.snapbell.label(percent(split.platformFeeBps / 10_000)), detail: t.parts.snapbell.detail, cents: split.platformFeeCents, className: "bg-ink text-bg" },
    { key: "card", ...t.parts.card, cents: split.cardFeeCents, className: "bg-muted text-bg" },
    { key: "tax", ...t.parts.tax, cents: split.taxCents, className: "bg-border text-ink" },
  ];
  const equation = `${[split.studioPayoutCents, split.labCostCents, split.platformFeeCents, split.cardFeeCents, split.taxCents].map((c) => money(c)).join(" + ")} = ${money(split.totalCents)}`;
  return (
    <figure className="grid gap-6 rounded-card border border-border bg-surface p-6 md:p-8">
      <figcaption className="grid gap-1">
        <p className="text-sm text-muted">{t.example(money(subtotal))}</p>
        <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
          {t.parentPays(money(split.totalCents))} <ArrowRight className="size-5 text-muted" aria-hidden /> {t.split}
        </p>
      </figcaption>
      <div className="flex h-12 overflow-hidden rounded-input" aria-hidden>
        {parts.map((p) => (
          <div key={p.key} className={p.className} style={{ width: `${(p.cents / split.totalCents) * 100}%` }} />
        ))}
      </div>
      <dl className="grid gap-3 md:grid-cols-5">
        {parts.map((p) => (
          <div key={p.key} className="grid content-start gap-1">
            <dt className="flex items-center gap-2 text-sm font-semibold">
              <span className={`size-3 shrink-0 rounded-sm ${p.className}`} aria-hidden />
              {p.label}
            </dt>
            <dd className="text-lg font-semibold tabular-nums">{money(p.cents)}</dd>
            <dd className="text-xs text-muted">{p.detail}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted">{t.footnote(equation)}</p>
    </figure>
  );
}
