import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

const tones = {
  neutral: "bg-sunken text-ink",
  accent: "bg-accent text-accent-ink",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning-ink",
  danger: "bg-danger/12 text-danger",
  sage: "bg-sage/15 text-sage",
  outline: "border border-border text-muted",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3", tones[tone], className)}
      {...props}
    />
  );
}
