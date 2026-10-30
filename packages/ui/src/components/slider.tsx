"use client";

import { Slider as S } from "radix-ui";
import { cn } from "../lib/cn";

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  "aria-label": ariaLabel,
  "aria-valuetext": valueText,
}: {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  "aria-label": string;
  "aria-valuetext"?: string;
}) {
  return (
    <S.Root
      value={[value]}
      onValueChange={([v]) => onValueChange(v ?? min)}
      min={min}
      max={max}
      step={step}
      className={cn("relative flex h-11 w-full touch-none items-center select-none", className)}
    >
      <S.Track className="relative h-2 grow overflow-hidden rounded-full bg-ink/10">
        <S.Range className="absolute h-full bg-accent" />
      </S.Track>
      <S.Thumb
        aria-label={ariaLabel}
        aria-valuetext={valueText}
        className="block size-6 rounded-full border-2 border-ink bg-surface shadow-hover transition-transform duration-150 hover:scale-105"
      />
    </S.Root>
  );
}
