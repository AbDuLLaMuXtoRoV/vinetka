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
