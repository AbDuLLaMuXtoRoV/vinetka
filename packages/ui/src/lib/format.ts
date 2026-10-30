/**
 * English-only helpers. For anything a user reads, prefer the locale-aware
 * `formatters(locale)` from @snapbell/sdk (or `useFormatters()` in client components).
 */

const DAY = 86_400_000;

export function formatDate(iso: string | Date, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  return new Intl.DateTimeFormat("en-US", opts).format(new Date(iso));
}

export function formatDateTime(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** "in 3 days", "2 hours ago", "yesterday". */
export function formatRelative(iso: string | Date, now: Date = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diff);
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < DAY) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 30 * DAY) return rtf.format(Math.round(diff / DAY), "day");
  return rtf.format(Math.round(diff / (30 * DAY)), "month");
}

export interface Countdown {
  label: string;
  days: number;
  hours: number;
  /** Two days or less left. */
  urgent: boolean;
  closed: boolean;
}

/** Deadline countdown for album headers and job cards. */
export function countdown(deadline: string | Date | null, now: Date = new Date()): Countdown | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - now.getTime();
  if (ms <= 0) return { label: "Ordering closed", days: 0, hours: 0, urgent: false, closed: true };
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / 3_600_000);
  const label = days === 0 ? (hours <= 1 ? "Closes within the hour" : `${hours} hours left`) : days === 1 ? "1 day left" : `${days} days left`;
  return { label, days, hours, urgent: days < 2, closed: false };
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatPercent(fraction: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: digits }).format(fraction);
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
