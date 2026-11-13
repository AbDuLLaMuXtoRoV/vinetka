import { describe, expect, it } from "vitest";
import { defineMessages, formatters, isLocale, negotiateLocale, plural } from "./i18n";

describe("negotiateLocale", () => {
  it("picks the best supported language by q-value", () => {
    expect(negotiateLocale("ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru");
    expect(negotiateLocale("de-DE,uz;q=0.7,en;q=0.5")).toBe("uz");
    expect(negotiateLocale("en;q=0.4,uz-Latn-UZ;q=0.9")).toBe("uz");
    expect(negotiateLocale("fr,de")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
  });

  it("guards locale values", () => {
    expect(isLocale("ru")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });
});

describe("plural", () => {
  const days = { one: "# день", few: "# дня", many: "# дней", other: "# дня" };
  it("uses the three Russian forms", () => {
    expect(plural("ru", 1, days)).toBe("1 день");
    expect(plural("ru", 3, days)).toBe("3 дня");
    expect(plural("ru", 5, days)).toBe("5 дней");
    expect(plural("ru", 21, days)).toBe("21 день");
    expect(plural("ru", 12, days)).toBe("12 дней");
  });

  it("uses one/other in English", () => {
    expect(plural("en", 1, { one: "# photo", other: "# photos" })).toBe("1 photo");
    expect(plural("en", 2, { one: "# photo", other: "# photos" })).toBe("2 photos");
  });
});

describe("formatters", () => {
  const now = new Date("2026-11-01T12:00:00Z");

  it("formats money per locale (USD everywhere for now)", () => {
    expect(formatters("en").money(199_950)).toBe("$1,999.50");
    expect(formatters("ru").money(199_950).replace(/\s/g, " ")).toBe("1 999,50 $");
    expect(formatters("uz").money(199_950).replace(/\s/g, " ")).toBe("1 999,50 US$");
  });

  it("localizes the deadline countdown", () => {
    const deadline = new Date(now.getTime() + 5 * 86_400_000 + 3_600_000);
    expect(formatters("en").countdown(deadline, now)?.label).toBe("5 days left");
    expect(formatters("ru").countdown(deadline, now)?.label).toBe("Осталось 5 дней");
    expect(formatters("uz").countdown(deadline, now)?.label).toBe("5 kun qoldi");
    expect(formatters("ru").countdown(new Date(now.getTime() - 1), now)?.closed).toBe(true);
  });
});

describe("defineMessages", () => {
  it("returns one dictionary per locale", () => {
    const m = defineMessages({ hi: "Hello", n: (k: number) => `${k}` }, { ru: { hi: "Привет", n: (k) => `${k}` }, uz: { hi: "Salom", n: (k) => `${k}` } });
    expect(m.ru.hi).toBe("Привет");
    expect(m.uz.n(2)).toBe("2");
  });
});

describe("Uzbek formatting without browser locale data", () => {
  // Chromium ships no uz CLDR data, so these must not depend on Intl("uz").
  const d = new Date("2026-11-24T10:00:00Z");
  const uz = formatters("uz");

  it("formats dates like CLDR uz", () => {
    const tz = { timeZone: "Asia/Tashkent" } as const;
    expect(uz.date(d, { year: "numeric", month: "short", day: "numeric", ...tz })).toBe("24-noy, 2026");
    expect(uz.date(d, { month: "short", day: "numeric", weekday: "short", ...tz })).toBe("Sesh, 24-noy");
    expect(uz.date(d, { weekday: "long", month: "long", day: "numeric", ...tz })).toBe("seshanba, 24-noyabr");
    expect(uz.date(d, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", ...tz })).toBe("24-noy, 15:00");
    expect(uz.date(d, { weekday: "short", ...tz })).toBe("Sesh");
  });

  it("matches full ICU (Node, Safari) for the default date", () => {
    expect(uz.date(d)).toBe(new Intl.DateTimeFormat("uz-Latn-UZ", { year: "numeric", month: "short", day: "numeric" }).format(d));
  });

  it("formats money, numbers and percentages", () => {
    expect(uz.money(1_999).replace(/\s/g, " ")).toBe("19,99 US$");
    expect(uz.money(250_000_00, { whole: true }).replace(/\s/g, " ")).toBe("250 000 US$");
    expect(uz.number(12_345).replace(/\s/g, " ")).toBe("12 345");
    expect(uz.percent(0.125, 1)).toBe("12,5%");
  });

  it("formats relative times", () => {
    const now = new Date("2026-11-01T12:00:00Z");
    expect(uz.relative(new Date(now.getTime() + 3 * 86_400_000), now)).toBe("3 kundan keyin");
    expect(uz.relative(new Date(now.getTime() - 2 * 3_600_000), now)).toBe("2 soat oldin");
    expect(uz.relative(new Date(now.getTime() + 86_400_000), now)).toBe("ertaga");
  });
});
