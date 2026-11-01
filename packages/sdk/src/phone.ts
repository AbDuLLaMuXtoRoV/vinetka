/**
 * Phone numbers. Snapbell launches in Uzbekistan, so national numbers default
 * to +998 (9 national digits: 2-digit operator code + 7 digits, written
 * "90 123 45 67"). Numbers typed with a leading "+" are accepted from any country.
 */
export type PhoneCountry = "UZ" | "US";

export const PHONE_COUNTRIES: Record<PhoneCountry, { dial: string; nationalLength: number; placeholder: string }> = {
  UZ: { dial: "998", nationalLength: 9, placeholder: "90 123 45 67" },
  US: { dial: "1", nationalLength: 10, placeholder: "(555) 555-0123" },
};

export const DEFAULT_PHONE_COUNTRY: PhoneCountry = "UZ";

/** National digits, without the country code: "+998 90 123-45-67" → "901234567". */
export function nationalDigits(raw: string, country: PhoneCountry = DEFAULT_PHONE_COUNTRY): string {
  const { dial, nationalLength } = PHONE_COUNTRIES[country];
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith(dial) && digits.length > nationalLength) digits = digits.slice(dial.length);
  return digits.slice(0, nationalLength);
}

/** Formats as you type: UZ "90 123 45 67", US "(555) 555-0123". */
export function formatPhoneNational(raw: string, country: PhoneCountry = DEFAULT_PHONE_COUNTRY): string {
  const d = nationalDigits(raw, country);
  if (country === "US") {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");
}

/**
 * E.164 ("+998901234567"), or null when incomplete. A leading "+" means the
 * number is already international (any country, 8–15 digits).
 */
export function toE164(raw: string, country: PhoneCountry = DEFAULT_PHONE_COUNTRY): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  const { dial, nationalLength } = PHONE_COUNTRIES[country];
  if (digits.length === nationalLength) return `+${dial}${digits}`;
  if (digits.length === dial.length + nationalLength && digits.startsWith(dial)) return `+${digits}`;
  return null;
}

/** Human-readable international form: "+998 90 123 45 67", "+1 (555) 555-0123". */
export function formatPhoneDisplay(e164: string): string {
  for (const country of Object.keys(PHONE_COUNTRIES) as PhoneCountry[]) {
    const { dial, nationalLength } = PHONE_COUNTRIES[country];
    const digits = e164.replace(/\D/g, "");
    if (e164.startsWith(`+${dial}`) && digits.length === dial.length + nationalLength) {
      return `+${dial} ${formatPhoneNational(digits.slice(dial.length), country)}`;
    }
  }
  return e164;
}
