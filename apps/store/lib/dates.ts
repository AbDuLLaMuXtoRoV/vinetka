import type { Formatters } from "@snapbell/sdk";

/**
 * A day that reads naturally inside a sentence: "Saturday, November 14" in English,
 * "14 ноября" / "14-noyabr" in Russian and Uzbek (a weekday there would need a different case).
 */
export function dayInSentence(fmt: Formatters, iso: string): string {
  return fmt.locale === "en" ? fmt.date(iso, { weekday: "long", month: "long", day: "numeric" }) : fmt.date(iso, { month: "long", day: "numeric" });
}

/** A standalone day label: "Saturday, November 14" / "суббота, 14 ноября" / "shanba, 14-noyabr". */
export function dayWithWeekday(fmt: Formatters, iso: string): string {
  return fmt.date(iso, { weekday: "long", month: "long", day: "numeric" });
}
