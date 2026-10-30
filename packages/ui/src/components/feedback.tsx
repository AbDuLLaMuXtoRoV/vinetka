import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { Locale } from "@snapbell/sdk";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";
import { uiMessages } from "../lib/messages";

const alertTones = {
  info: { box: "border-border bg-surface", icon: Info, iconClass: "text-ink" },
  success: { box: "border-success/30 bg-success/8", icon: CircleCheck, iconClass: "text-success" },
  warning: { box: "border-warning/40 bg-warning/10", icon: TriangleAlert, iconClass: "text-warning-ink" },
  danger: { box: "border-danger/30 bg-danger/8", icon: CircleAlert, iconClass: "text-danger" },
} as const;

/** Inline alert banner. The icon and title carry the meaning, never color alone. */
export function Alert({
  tone = "info",
  title,
  action,
  className,
  children,
}: {
  tone?: keyof typeof alertTones;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const t = alertTones[tone];
  const Icon = t.icon;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-card border p-4", t.box, className)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", t.iconClass)} aria-hidden />
      <div className="grid flex-1 gap-1 text-sm">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children && <div className="text-muted">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  showValue = true,
  tone = "accent",
  className,
}: {
  /** 0..100 */
  value: number;
  label: string;
  showValue?: boolean;
  tone?: "accent" | "success" | "ink";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        {showValue && <span className="font-medium tabular-nums">{pct}%</span>}
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-ink/10">
        <div
          className={cn("h-full rounded-full transition-[width] duration-250 ease-out", tone === "accent" ? "bg-accent" : tone === "success" ? "bg-success" : "bg-ink")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-pulse rounded-input bg-ink/8", className)} {...props} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-center gap-3 rounded-card border border-dashed border-border px-6 py-12 text-center", className)}>
      {icon && <div className="grid size-12 place-items-center rounded-full bg-sunken text-muted [&_svg]:size-6">{icon}</div>}
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Body of a 404 / 500 page. */
export function ErrorPage({ code, title, description, action, locale = "en" }: { code: 404 | 500 | number; title: ReactNode; description?: ReactNode; action?: ReactNode; locale?: Locale }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 py-16 text-center">
      <div className="grid max-w-md justify-items-center gap-4">
        <p className="font-mono text-sm tracking-widest text-muted uppercase">{uiMessages[locale].error} {code}</p>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        {description && <p className="text-muted">{description}</p>}
        {action && <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>}
      </div>
    </div>
  );
}

export function Spinner({ className, label, locale = "en" }: { className?: string; label?: string; locale?: Locale }) {
  return (
    <span role="status" className={cn("inline-block size-5 animate-spin rounded-full border-2 border-ink/20 border-t-ink", className)}>
      <span className="sr-only">{label ?? uiMessages[locale].loading}</span>
    </span>
  );
}
