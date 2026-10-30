import type { Cents } from "./types";

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, locale: string, whole: boolean): Intl.NumberFormat {
  const key = `${locale}:${currency}:${whole}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    });
    formatters.set(key, f);
  }
  return f;
}

/** 1999 → "$19.99". Pass `whole` to drop cents for large marketing figures. */
export function formatMoney(
  cents: Cents,
  opts: { currency?: string; locale?: string; whole?: boolean } = {},
): string {
  const { currency = "USD", locale = "en-US", whole = false } = opts;
  return formatter(currency, locale, whole).format(cents / 100);
}

/** "$1,234.5" or "1234.50" → 123450. Returns null for anything unparsable. */
export function parseMoney(input: string): Cents | null {
  const cleaned = input.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Integer-safe percentage of an amount: bps(10000, 800) → 800 (8% of $100). Rounds half up. */
export function bps(cents: Cents, basisPoints: number): Cents {
  return Math.round((cents * basisPoints) / 10_000);
}

export function formatBps(basisPoints: number): string {
  const pct = basisPoints / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
