import { bps, clamp } from "./money";
import type { Cents, OrderSplit, Promo } from "./types";

/**
 * Snapbell pricing: no monthly fee, the studio pays only when it sells.
 *
 * Platform fee tiers are marginal, like tax brackets: 8% on a studio's first
 * $250K of yearly sales and 6% on everything above it. Marginal tiers avoid a
 * cliff where crossing the threshold would lower the total fee.
 */
export const PLATFORM_FEE_STANDARD_BPS = 800;
export const PLATFORM_FEE_VOLUME_BPS = 600;
export const VOLUME_TIER_THRESHOLD_CENTS: Cents = 250_000_00;

/** Card processing passed through at Stripe's standard US rate. */
export const CARD_FEE_BPS = 290;
export const CARD_FEE_FIXED_CENTS: Cents = 30;

/** Flat delivery prices; school pickup is only offered on bulk-shipping jobs. */
export const SHIPPING_CENTS = { home: 695, school_pickup: 0 } as const;

/** Retouch add-on in the customizer, per item. */
export const RETOUCH_ADDON = { priceCents: 800, labCostCents: 300 } as const;

/** Rate for the next order given the studio's sales so far this year. */
export function platformFeeBpsFor(ytdSalesCents: Cents): number {
  return ytdSalesCents >= VOLUME_TIER_THRESHOLD_CENTS
    ? PLATFORM_FEE_VOLUME_BPS
    : PLATFORM_FEE_STANDARD_BPS;
}

/** Total platform fee for a year of sales, applying the tiers marginally. */
export function yearlyPlatformFee(yearlySalesCents: Cents): Cents {
  const standard = Math.min(yearlySalesCents, VOLUME_TIER_THRESHOLD_CENTS);
  const volume = Math.max(0, yearlySalesCents - VOLUME_TIER_THRESHOLD_CENTS);
  return bps(standard, PLATFORM_FEE_STANDARD_BPS) + bps(volume, PLATFORM_FEE_VOLUME_BPS);
}

export function cardFee(chargedCents: Cents): Cents {
  if (chargedCents <= 0) return 0;
  return bps(chargedCents, CARD_FEE_BPS) + CARD_FEE_FIXED_CENTS;
}

export interface SplitInput {
  subtotalCents: Cents;
  discountCents: Cents;
  shippingCents: Cents;
  taxCents: Cents;
  labCostCents: Cents;
  passCreditCents?: Cents;
  ytdSalesCents?: Cents;
}

/**
 * Where every cent of an order goes. The studio payout is the remainder, so
 * tax + lab cost + platform fee + card fee + payout always equals the total.
 * Tax is collected for remittance and carries no platform fee; card fees apply
 * to what is charged now (Pass credit was charged when the Pass was bought).
 */
export function splitOrder(input: SplitInput): OrderSplit {
  const subtotal = Math.max(0, input.subtotalCents);
  const discount = clamp(input.discountCents, 0, subtotal);
  const shipping = Math.max(0, input.shippingCents);
  const tax = Math.max(0, input.taxCents);
  const merchandise = subtotal - discount;
  const total = merchandise + shipping + tax;
  const passCredit = clamp(input.passCreditCents ?? 0, 0, total);
  const charged = total - passCredit;
  const rate = platformFeeBpsFor(input.ytdSalesCents ?? 0);
  const platformFee = bps(merchandise + shipping, rate);
  const card = cardFee(charged);
  const labCost = Math.max(0, input.labCostCents);

  return {
    subtotalCents: subtotal,
    discountCents: discount,
    shippingCents: shipping,
    taxCents: tax,
    totalCents: total,
    passCreditCents: passCredit,
    chargedCents: charged,
    labCostCents: labCost,
    platformFeeBps: rate,
    platformFeeCents: platformFee,
    cardFeeCents: card,
    studioPayoutCents: total - tax - labCost - platformFee - card,
  };
}

export interface ItemEconomics {
  platformFeeCents: Cents;
  /** Percentage part of the card fee only; the fixed 30¢ is per order. */
  cardFeeCents: Cents;
  profitCents: Cents;
  marginBps: number;
  /** Price does not cover lab cost plus fees: the price sheet editor warns. */
  belowCost: boolean;
}

/** Per-row economics for the price sheet editor. */
export function itemEconomics(input: {
  priceCents: Cents;
  labCostCents: Cents;
  platformFeeBps?: number;
}): ItemEconomics {
  const rate = input.platformFeeBps ?? PLATFORM_FEE_STANDARD_BPS;
  const platformFee = bps(input.priceCents, rate);
  const card = bps(input.priceCents, CARD_FEE_BPS);
  const profit = input.priceCents - input.labCostCents - platformFee - card;
  return {
    platformFeeCents: platformFee,
    cardFeeCents: card,
    profitCents: profit,
    marginBps: input.priceCents > 0 ? Math.round((profit / input.priceCents) * 10_000) : 0,
    belowCost: profit < 0,
  };
}

export interface YearlyEstimateInput {
  yearlySalesCents: Cents;
  averageOrderCents: Cents;
  /** Lab cost as basis points of sales (2500 = 25%). */
  labCostBps: number;
  /** "Your current platform at X%", in basis points. */
  compareRateBps?: number;
}

export interface YearlyEstimate {
  orders: number;
  platformFeeCents: Cents;
  cardFeesCents: Cents;
  labCostCents: Cents;
  keepCents: Cents;
  effectivePlatformBps: number;
  compare: { platformFeeCents: Cents; keepCents: Cents; differenceCents: Cents } | null;
}

/** Powers the fee calculator on the home page, the pricing page and onboarding. */
export function yearlyEstimate(input: YearlyEstimateInput): YearlyEstimate {
  const sales = Math.max(0, input.yearlySalesCents);
  const aov = Math.max(1, input.averageOrderCents);
  const orders = sales === 0 ? 0 : Math.max(1, Math.round(sales / aov));
  const platformFee = yearlyPlatformFee(sales);
  const cardFees = bps(sales, CARD_FEE_BPS) + CARD_FEE_FIXED_CENTS * orders;
  const labCost = bps(sales, input.labCostBps);
  const keep = sales - platformFee - cardFees - labCost;

  let compare: YearlyEstimate["compare"] = null;
  if (input.compareRateBps !== undefined) {
    const theirFee = bps(sales, input.compareRateBps);
    const theirKeep = sales - theirFee - cardFees - labCost;
    compare = { platformFeeCents: theirFee, keepCents: theirKeep, differenceCents: keep - theirKeep };
  }

  return {
    orders,
    platformFeeCents: platformFee,
    cardFeesCents: cardFees,
    labCostCents: labCost,
    keepCents: keep,
    effectivePlatformBps: sales > 0 ? Math.round((platformFee / sales) * 10_000) : PLATFORM_FEE_STANDARD_BPS,
    compare,
  };
}

export type PromoErrorCode = "inactive" | "not_started" | "expired" | "exhausted" | "wrong_job" | "min_subtotal";

export interface PromoResult {
  discountCents: Cents;
  shippingCents: Cents;
  /** English message; localize from `code` for other languages. */
  error: string | null;
  code: PromoErrorCode | null;
}

/** Applies a promo to a cart. Validity windows and usage limits are checked against `now`. */
export function applyPromo(
  promo: Promo | null,
  input: { subtotalCents: Cents; shippingCents: Cents; jobIds: string[]; now?: Date },
): PromoResult {
  const none = { discountCents: 0, shippingCents: input.shippingCents };
  if (!promo) return { ...none, error: null, code: null };
  const now = input.now ?? new Date();
  if (!promo.active) return { ...none, error: "This code is no longer active.", code: "inactive" };
  if (promo.startsAt && new Date(promo.startsAt) > now) return { ...none, error: "This code isn't active yet.", code: "not_started" };
  if (promo.endsAt && new Date(promo.endsAt) < now) return { ...none, error: "This code has expired.", code: "expired" };
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
    return { ...none, error: "This code has been fully redeemed.", code: "exhausted" };
  }
  if (promo.jobIds.length > 0 && !input.jobIds.some((id) => promo.jobIds.includes(id))) {
    return { ...none, error: "This code doesn't apply to these photos.", code: "wrong_job" };
  }
  if (input.subtotalCents < promo.minSubtotalCents) {
    return { ...none, error: `Spend at least $${(promo.minSubtotalCents / 100).toFixed(2)} to use this code.`, code: "min_subtotal" };
  }
  switch (promo.kind) {
    case "percent":
      return { discountCents: bps(input.subtotalCents, promo.value), shippingCents: input.shippingCents, error: null, code: null };
    case "fixed":
      return { discountCents: Math.min(promo.value, input.subtotalCents), shippingCents: input.shippingCents, error: null, code: null };
    case "free_shipping":
      return { discountCents: 0, shippingCents: 0, error: null, code: null };
  }
}

/** Credit granted for a Picture Day Pass purchase (pay $50 with a 10% bonus → $55 credit). */
export function passCredit(amountPaidCents: Cents, bonusBps: number): Cents {
  return amountPaidCents + bps(amountPaidCents, bonusBps);
}
