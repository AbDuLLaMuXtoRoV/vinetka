"use client";

import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  formatPhoneDisplay,
  formatPhoneNational,
  toE164 as toE164For,
  type PhoneCountry,
} from "@snapbell/sdk";
import type { ComponentProps } from "react";
import { cn } from "../lib/cn";
import { inputClass } from "./input";

export { formatPhoneDisplay, formatPhoneNational };

/** "90 123 45 67" → "+998901234567", or null when incomplete (Uzbekistan unless `country` says otherwise). */
export function toE164(raw: string, country: PhoneCountry = DEFAULT_PHONE_COUNTRY): string | null {
  return toE164For(raw, country);
}

/** National number field with the country code shown as a fixed prefix (+998 by default). */
export function PhoneInput({
  value,
  onValueChange,
  country = DEFAULT_PHONE_COUNTRY,
  className,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (formatted: string) => void;
  country?: PhoneCountry;
}) {
  const { dial, placeholder } = PHONE_COUNTRIES[country];
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted" aria-hidden>
        +{dial}
      </span>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={value}
        onChange={(e) => onValueChange(formatPhoneNational(e.target.value, country))}
        placeholder={placeholder}
        className={cn(inputClass, dial.length > 1 ? "pl-14" : "pl-9", className)}
        {...props}
      />
    </div>
  );
}
