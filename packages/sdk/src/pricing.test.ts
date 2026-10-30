import { describe, expect, it } from "vitest";
import { mulberry32 } from "./codes";
import { createDemoData, DEMO_CODES } from "./fixtures";
import { bps, formatMoney, parseMoney } from "./money";
import {
  applyPromo,
  cardFee,
  itemEconomics,
  passCredit,
  platformFeeBpsFor,
  splitOrder,
  yearlyEstimate,
  yearlyPlatformFee,
} from "./pricing";
import type { Promo } from "./types";

describe("money", () => {
  it("formats and parses cents", () => {
    expect(formatMoney(199_99)).toBe("$199.99");
    expect(formatMoney(250_000_00, { whole: true })).toBe("$250,000");
    expect(parseMoney("$1,234.5")).toBe(123_450);
    expect(parseMoney("abc")).toBeNull();
  });

  it("computes basis points without float drift", () => {
    expect(bps(1999, 800)).toBe(160);
    expect(bps(10_000, 290)).toBe(290);
  });
});

describe("platform fee tiers", () => {
  it("charges 8% up to $250K and 6% above, marginally", () => {
    expect(yearlyPlatformFee(100_000_00)).toBe(8_000_00);
    expect(yearlyPlatformFee(250_000_00)).toBe(20_000_00);
    expect(yearlyPlatformFee(300_000_00)).toBe(20_000_00 + 3_000_00);
  });

  it("never lowers the total fee when sales grow", () => {
    let previous = 0;
    for (let sales = 0; sales <= 400_000_00; sales += 5_000_00) {
      const fee = yearlyPlatformFee(sales);
      expect(fee).toBeGreaterThanOrEqual(previous);
      previous = fee;
    }
  });

  it("switches the per-order rate once year-to-date sales pass the threshold", () => {
    expect(platformFeeBpsFor(249_999_99)).toBe(800);
    expect(platformFeeBpsFor(250_000_00)).toBe(600);
  });
});

describe("splitOrder", () => {
  it("adds up to the cent on 20 test orders (launch checklist)", () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      const subtotal = 800 + Math.floor(rand() * 20_000);
      const split = splitOrder({
        subtotalCents: subtotal,
        discountCents: rand() < 0.3 ? Math.floor(subtotal * 0.1) : 0,
        shippingCents: rand() < 0.5 ? 695 : 0,
        taxCents: Math.floor(rand() * 1500),
        labCostCents: Math.floor(subtotal * (0.1 + rand() * 0.2)),
        passCreditCents: rand() < 0.2 ? 2500 : 0,
        ytdSalesCents: rand() < 0.5 ? 0 : 300_000_00,
      });
      const accounted =
        split.taxCents + split.labCostCents + split.platformFeeCents + split.cardFeeCents + split.studioPayoutCents;
      expect(accounted).toBe(split.totalCents);
      expect(split.chargedCents + split.passCreditCents).toBe(split.totalCents);
      expect(Number.isInteger(split.studioPayoutCents)).toBe(true);
    }
  });

  it("charges no platform fee on tax and no card fee on Pass credit", () => {
    const split = splitOrder({
      subtotalCents: 5000,
      discountCents: 0,
      shippingCents: 0,
      taxCents: 300,
      labCostCents: 1000,
      passCreditCents: 5300,
    });
    expect(split.platformFeeCents).toBe(400);
    expect(split.chargedCents).toBe(0);
    expect(split.cardFeeCents).toBe(0);
    expect(cardFee(0)).toBe(0);
  });

  it("caps discounts and Pass credit", () => {
    const split = splitOrder({
      subtotalCents: 1000,
      discountCents: 5000,
      shippingCents: 0,
      taxCents: 0,
      labCostCents: 0,
      passCreditCents: 9999,
    });
    expect(split.discountCents).toBe(1000);
    expect(split.totalCents).toBe(0);
    expect(split.passCreditCents).toBe(0);
  });
});

describe("price sheet row economics", () => {
  it("warns when the price is below lab cost plus fees", () => {
    expect(itemEconomics({ priceCents: 2200, labCostCents: 210 }).belowCost).toBe(false);
    expect(itemEconomics({ priceCents: 500, labCostCents: 480 }).belowCost).toBe(true);
  });
});

describe("yearlyEstimate", () => {
  it("returns what the studio keeps and the comparison", () => {
    const est = yearlyEstimate({
      yearlySalesCents: 100_000_00,
      averageOrderCents: 50_00,
      labCostBps: 2000,
      compareRateBps: 1500,
    });
    expect(est.orders).toBe(2000);
    expect(est.platformFeeCents).toBe(8_000_00);
    expect(est.labCostCents).toBe(20_000_00);
    expect(est.cardFeesCents).toBe(2_900_00 + 600_00);
    expect(est.keepCents).toBe(100_000_00 - 8_000_00 - 3_500_00 - 20_000_00);
    expect(est.compare?.differenceCents).toBe(7_000_00);
  });
});

describe("promos and passes", () => {
  const promo: Promo = {
    id: "p",
    studioId: "s",
    code: "FALL10",
    kind: "percent",
    value: 1000,
    minSubtotalCents: 0,
    startsAt: null,
    endsAt: null,
    jobIds: [],
    usageCount: 0,
    usageLimit: null,
    active: true,
  };

  it("applies percent, fixed and free shipping", () => {
    expect(applyPromo(promo, { subtotalCents: 5000, shippingCents: 695, jobIds: [] }).discountCents).toBe(500);
    expect(applyPromo({ ...promo, kind: "fixed", value: 700 }, { subtotalCents: 500, shippingCents: 0, jobIds: [] }).discountCents).toBe(500);
    expect(applyPromo({ ...promo, kind: "free_shipping" }, { subtotalCents: 5000, shippingCents: 695, jobIds: [] }).shippingCents).toBe(0);
  });

  it("rejects expired, exhausted and wrong-job codes", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(applyPromo({ ...promo, endsAt: past }, { subtotalCents: 5000, shippingCents: 0, jobIds: [] }).error).toMatch(/expired/);
    expect(applyPromo({ ...promo, usageLimit: 1, usageCount: 1 }, { subtotalCents: 5000, shippingCents: 0, jobIds: [] }).error).toMatch(/redeemed/);
    expect(applyPromo({ ...promo, jobIds: ["a"] }, { subtotalCents: 5000, shippingCents: 0, jobIds: ["b"] }).error).toMatch(/apply/);
  });

  it("adds the Pass bonus", () => {
    expect(passCredit(5000, 1000)).toBe(5500);
  });
});

describe("demo data", () => {
  const data = createDemoData(new Date("2026-10-30T12:00:00Z"));

  it("has the documented demo codes", () => {
    const codes = new Set(data.subjects.map((s) => s.accessCode));
    for (const code of Object.values(DEMO_CODES)) expect(codes.has(code)).toBe(true);
  });

  it("keeps every fixture order balanced to the cent", () => {
    for (const o of data.orders) {
      const s = o.split;
      expect(s.taxCents + s.labCostCents + s.platformFeeCents + s.cardFeeCents + s.studioPayoutCents).toBe(s.totalCents);
      expect(o.items.reduce((sum, li) => sum + li.lineTotalCents, 0)).toBe(s.subtotalCents);
    }
  });

  it("never exposes low-confidence matches on photos", () => {
    for (const m of data.matches.filter((x) => x.status === "review")) {
      const photo = data.photos.find((p) => p.id === m.photoId)!;
      expect(photo.subjectIds).not.toContain(m.subjectId);
    }
  });
});
