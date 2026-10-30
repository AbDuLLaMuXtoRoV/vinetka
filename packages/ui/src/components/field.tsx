import type { Locale } from "@snapbell/sdk";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { uiMessages } from "../lib/messages";

/**
 * Label + control + hint/error. Give the control `id={htmlFor}` and
 * `aria-describedby={describedBy(htmlFor, …)}` so screen readers read the hint or error.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  locale = "en",
  className,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  locale?: Locale;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-muted"> ({uiMessages[locale].optional})</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, opts: { hint?: unknown; error?: unknown }): string | undefined {
  if (opts.error) return `${id}-error`;
  if (opts.hint) return `${id}-hint`;
  return undefined;
}
