import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, formatPhoneNational, nationalDigits, toE164 } from "./phone";

describe("Uzbek phone numbers (default)", () => {
  it("formats national numbers as you type", () => {
    expect(formatPhoneNational("90")).toBe("90");
    expect(formatPhoneNational("901234")).toBe("90 123 4");
    expect(formatPhoneNational("901234567")).toBe("90 123 45 67");
    expect(formatPhoneNational("9012345678999")).toBe("90 123 45 67");
  });

  it("accepts national, 998-prefixed and +998 forms", () => {
    expect(toE164("90 123 45 67")).toBe("+998901234567");
    expect(toE164("998901234567")).toBe("+998901234567");
    expect(toE164("+998 (90) 123-45-67")).toBe("+998901234567");
    expect(nationalDigits("+998901234567")).toBe("901234567");
  });

  it("rejects incomplete numbers and keeps other countries when written with +", () => {
    expect(toE164("90 123 45")).toBeNull();
    expect(toE164("+1 555 555 0123")).toBe("+15555550123");
    expect(toE164("+7 912 345 67 89")).toBe("+79123456789");
  });

  it("displays E.164 numbers readably", () => {
    expect(formatPhoneDisplay("+998901234567")).toBe("+998 90 123 45 67");
    expect(formatPhoneDisplay("+15555550123")).toBe("+1 (555) 555-0123");
    expect(formatPhoneDisplay("+79123456789")).toBe("+79123456789");
  });
});

describe("US phone numbers (opt-in)", () => {
  it("still works when the US country is chosen", () => {
    expect(formatPhoneNational("5555550123", "US")).toBe("(555) 555-0123");
    expect(toE164("(555) 555-0123", "US")).toBe("+15555550123");
  });
});
