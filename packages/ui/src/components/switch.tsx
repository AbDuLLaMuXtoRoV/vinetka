"use client";

import { Switch as S } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

export function Switch({
  id,
  label,
  description,
  className,
  ...props
}: ComponentProps<typeof S.Root> & { id: string; label?: ReactNode; description?: ReactNode }) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      {(label || description) && (
        <label htmlFor={id} className="grid cursor-pointer gap-0.5 text-sm">
          {label && <span className="font-medium text-ink">{label}</span>}
          {description && <span className="text-xs text-muted">{description}</span>}
        </label>
      )}
      <S.Root
        id={id}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-ink/20 transition-colors duration-150 data-[state=checked]:bg-success disabled:opacity-50"
        {...props}
      >
        <S.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-[22px]" />
      </S.Root>
    </div>
  );
}
