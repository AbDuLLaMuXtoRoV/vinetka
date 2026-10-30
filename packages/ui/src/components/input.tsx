import type { ComponentProps } from "react";
import { cn } from "../lib/cn";

/** 16px on mobile so iOS Safari does not zoom on focus; 14px from tablet up. */
export const inputClass =
  "h-11 w-full rounded-input border border-border bg-surface px-3 text-base text-ink placeholder:text-muted/80 transition-colors duration-150 hover:border-ink/30 focus-visible:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15 aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

/** Free text with suggestions (native datalist). */
export function Combobox({ id, options, className, ...props }: ComponentProps<"input"> & { id: string; options: string[] }) {
  return (
    <>
      <input id={id} list={`${id}-options`} className={cn(inputClass, className)} autoComplete="off" {...props} />
      <datalist id={`${id}-options`}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}
