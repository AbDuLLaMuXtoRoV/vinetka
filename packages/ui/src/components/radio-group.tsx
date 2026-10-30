"use client";

import { RadioGroup as R } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

/** `variant="cards"` renders each option as a selectable card (album type, delivery method). */
export function RadioGroup({
  name,
  value,
  onValueChange,
  options,
  variant = "list",
  className,
  "aria-label": ariaLabel,
}: {
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  variant?: "list" | "cards";
  className?: string;
  "aria-label"?: string;
}) {
  const dot = (id: string, o: RadioOption) => (
    <R.Item
      id={id}
      value={o.value}
      disabled={o.disabled}
      className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-ink/40 data-[state=checked]:border-ink"
    >
      <R.Indicator className="size-2.5 rounded-full bg-ink" />
    </R.Item>
  );

  return (
    <R.Root
      name={name}
      value={value}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
      className={cn(variant === "cards" ? "grid gap-3 md:auto-cols-fr md:grid-flow-col" : "grid gap-3", className)}
    >
      {options.map((o) => {
        const id = `${name ?? "radio"}-${o.value}`;
        return variant === "cards" ? (
          <label
            key={o.value}
            htmlFor={id}
            className="flex cursor-pointer items-start gap-3 rounded-card border border-border bg-surface p-4 transition-colors duration-150 hover:border-ink/40 has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:ring-1 has-[[data-state=checked]]:ring-ink"
          >
            {dot(id, o)}
            <span className="grid gap-1">
              <span className="text-sm font-medium">{o.label}</span>
              {o.description && <span className="text-xs text-muted">{o.description}</span>}
            </span>
          </label>
        ) : (
          <div key={o.value} className="flex items-start gap-3">
            {dot(id, o)}
            <label htmlFor={id} className="grid cursor-pointer gap-0.5 text-sm">
              <span>{o.label}</span>
              {o.description && <span className="text-xs text-muted">{o.description}</span>}
            </label>
          </div>
        );
      })}
    </R.Root>
  );
}
