"use client";

import type { ComponentProps } from "react";
import { cn } from "../lib/cn";
import { inputClass } from "./input";

/** Formats US numbers as you type: (555) 555-0123. */
export function formatUsPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** "(555) 555-0123" → "+15555550123", or null when incomplete. */
export function toE164(raw: string): string | null {
  const d = raw.replace(/\D/g, "").replace(/^1(?=\d{10})/, "");
  return d.length === 10 ? `+1${d}` : null;
}

export function PhoneInput({
  value,
  onValueChange,
  className,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & { value: string; onValueChange: (formatted: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted" aria-hidden>
        +1
      </span>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={value}
        onChange={(e) => onValueChange(formatUsPhone(e.target.value))}
        placeholder="(555) 555-0123"
        className={cn(inputClass, "pl-9", className)}
        {...props}
      />
    </div>
  );
}
