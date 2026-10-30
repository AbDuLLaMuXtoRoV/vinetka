"use client";

import {
  PLATFORM_FEE_STANDARD_BPS,
  PLATFORM_FEE_VOLUME_BPS,
  VOLUME_TIER_THRESHOLD_CENTS,
  formatters,
  yearlyEstimate,
} from "@snapbell/sdk";
import { useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { uiMessages } from "../../lib/messages";
import { useLocale } from "../locale";
import { Slider } from "../slider";
import { Switch } from "../switch";

/**
 * "Your yearly sales → what you keep".
 * `variant="teaser"` is the single-slider version on the home page;
 * `variant="full"` is the pricing page calculator with every input and the comparison toggle.
 * `onUse` fires once, on the first interaction (analytics: calculator_used).
 */
export function FeeCalculator({ variant = "full", onUse, className }: { variant?: "teaser" | "full"; onUse?: () => void; className?: string }) {
  const locale = useLocale();
  const t = uiMessages[locale].fee;
  const fmt = formatters(locale);
  const [sales, setSales] = useState(120_000);
  const [aov, setAov] = useState(48);
  const [labPct, setLabPct] = useState(18);
  const [compare, setCompare] = useState(variant === "full");
  const [theirRate, setTheirRate] = useState(15);
  const used = useRef(false);

  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    if (!used.current) {
      used.current = true;
      onUse?.();
    }
    set(v);
  };

  const est = useMemo(
    () =>
      yearlyEstimate({
        yearlySalesCents: sales * 100,
        averageOrderCents: aov * 100,
        labCostBps: labPct * 100,
        compareRateBps: compare ? theirRate * 100 : undefined,
      }),
    [sales, aov, labPct, compare, theirRate],
  );

  const money = (c: number) => fmt.money(c, { whole: true });
  const pct = (bps: number, digits = 0) => fmt.percent(bps / 10_000, digits);
  const salesLabel = money(sales * 100);
  const theirRateLabel = pct(theirRate * 100);

  const salesSlider = (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium">{t.yearlySales}</span>
        <span className="text-lg font-semibold tabular-nums">{salesLabel}</span>
      </div>
      <Slider value={sales} onValueChange={touch(setSales)} min={10_000} max={600_000} step={5_000} aria-label={t.yearlySales} aria-valuetext={salesLabel} />
    </div>
  );

  if (variant === "teaser") {
    return (
      <div className={cn("grid gap-6 rounded-card border border-border bg-surface p-6 md:p-8", className)}>
        {salesSlider}
        <div className="grid gap-1 rounded-input bg-sunken p-5">
          <p className="text-sm text-muted">{t.keepTeaser}</p>
          <p className="text-3xl font-semibold tabular-nums" aria-live="polite">
            {money(sales * 100 - est.platformFeeCents - est.cardFeesCents)}
          </p>
          <p className="text-xs text-muted">{t.teaserNote(pct(PLATFORM_FEE_STANDARD_BPS))}</p>
        </div>
      </div>
    );
  }

  const numberInput = (id: string, label: string, value: number, set: (n: number) => void, suffix: string, min: number, max: number) => (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          value={value}
          onChange={(e) => touch(set)(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
          className="h-11 w-full rounded-input border border-border bg-surface px-3 pr-10 text-base tabular-nums focus-visible:border-ink focus-visible:outline-none md:text-sm"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">{suffix}</span>
      </div>
    </div>
  );

  const row = (label: string, cents: number, strong = false) => (
    <div className={cn("flex justify-between gap-4", strong ? "border-t border-border pt-3 text-base font-semibold" : "text-sm")}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className="tabular-nums">{strong ? money(cents) : `−${money(cents)}`}</dd>
    </div>
  );

  const more = est.compare ? t.moreThan(money(est.compare.differenceCents), theirRateLabel) : null;

  return (
    <div className={cn("grid gap-8 rounded-card border border-border bg-surface p-6 md:grid-cols-2 md:p-8", className)}>
      <div className="grid content-start gap-6">
        {salesSlider}
        <div className="grid grid-cols-2 gap-4">
          {numberInput("fc-aov", t.averageOrder, aov, setAov, "$", 5, 500)}
          {numberInput("fc-lab", t.labCost, labPct, setLabPct, "%", 0, 60)}
        </div>
        <div className="grid gap-4 rounded-input bg-sunken p-4">
          <Switch id="fc-compare" checked={compare} onCheckedChange={touch(setCompare)} label={t.compare} />
          {compare && (
            <div className="grid gap-1">
              <div className="flex justify-between text-sm">
                <span>{t.theirFee}</span>
                <span className="font-medium tabular-nums">{theirRateLabel}</span>
              </div>
              <Slider value={theirRate} onValueChange={touch(setTheirRate)} min={5} max={35} step={1} aria-label={t.theirFeeAria} aria-valuetext={theirRateLabel} />
            </div>
          )}
        </div>
      </div>
      <div className="grid content-start gap-4">
        <dl className="grid gap-2">
          <div className="flex justify-between gap-4 text-sm">
            <dt className="text-muted">{t.salesLine}</dt>
            <dd className="tabular-nums">{salesLabel}</dd>
          </div>
          {row(t.platformFeeLine(pct(est.effectivePlatformBps, 1)), est.platformFeeCents)}
          {row(t.cardLine(est.orders), est.cardFeesCents)}
          {row(t.labLine, est.labCostCents)}
          {row(t.keep, est.keepCents, true)}
        </dl>
        {est.compare && more && (
          <div className={cn("rounded-input p-4 text-sm", est.compare.differenceCents >= 0 ? "bg-success/10" : "bg-sunken")} aria-live="polite">
            {est.compare.differenceCents >= 0 ? (
              <p>
                {more[0]}
                <strong className="text-base tabular-nums">{more[1]}</strong>
                {more[2]}
              </p>
            ) : (
              <p>{t.costsLess(theirRateLabel, money(-est.compare.differenceCents))}</p>
            )}
          </div>
        )}
        <p className="text-xs text-muted">
          {t.footnote(pct(PLATFORM_FEE_STANDARD_BPS), money(VOLUME_TIER_THRESHOLD_CENTS), pct(PLATFORM_FEE_VOLUME_BPS))}
        </p>
      </div>
    </div>
  );
}
