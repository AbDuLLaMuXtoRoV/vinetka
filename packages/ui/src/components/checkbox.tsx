"use client";

import { Check } from "lucide-react";
import { Checkbox as C } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

export function Checkbox({
  id,
  label,
  description,
  className,
  ...props
}: ComponentProps<typeof C.Root> & { id: string; label?: ReactNode; description?: ReactNode }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <C.Root
        id={id}
        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border border-ink/40 bg-surface text-bg transition-colors duration-150 hover:border-ink data-[state=checked]:border-ink data-[state=checked]:bg-ink disabled:opacity-50"
        {...props}
      >
        <C.Indicator>
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        </C.Indicator>
      </C.Root>
      {(label || description) && (
        <label htmlFor={id} className="grid cursor-pointer gap-0.5 text-sm leading-snug">
          {label && <span className="text-ink">{label}</span>}
          {description && <span className="text-xs text-muted">{description}</span>}
        </label>
      )}
    </div>
  );
}
