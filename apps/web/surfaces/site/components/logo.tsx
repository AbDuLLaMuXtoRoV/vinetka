import { cn } from "@snapbell/ui/lib/cn";

/** Snapbell wordmark: a bell whose clapper is a shutter dot. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--sb-accent)" />
        <path d="M16 6.5c-4.4 0-7.5 3.4-7.5 7.8v4.4L6.8 22h18.4l-1.7-3.3v-4.4c0-4.4-3.1-7.8-7.5-7.8Z" fill="var(--sb-ink)" />
        <circle cx="16" cy="24.6" r="2.4" fill="var(--sb-ink)" />
        <circle cx="16" cy="14.6" r="3.2" fill="var(--sb-accent)" />
      </svg>
      {!compact && <span>snapbell</span>}
    </span>
  );
}
