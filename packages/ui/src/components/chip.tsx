import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

/** Toggleable filter chip (album poses, job filters). */
export function Chip({ selected = false, className, ...props }: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-input border px-3 text-sm whitespace-nowrap transition-colors duration-150 md:min-h-9 [&_svg]:size-4",
        selected ? "border-ink bg-ink text-bg" : "border-border bg-surface text-ink hover:border-ink/40",
        className,
      )}
      {...props}
    />
  );
}

/** Static label, e.g. a photo tag. */
export function Tag({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("inline-flex items-center rounded-input bg-sunken px-2 py-0.5 text-xs text-muted", className)} {...props} />;
}
