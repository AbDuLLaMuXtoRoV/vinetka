import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { Locale } from "@snapbell/sdk";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";
import { uiMessages } from "../lib/messages";

// --- Table -------------------------------------------------------------------

/** Scrolls horizontally on small screens instead of breaking the page. */
export function Table({ className, wrapperClassName, ...props }: ComponentProps<"table"> & { wrapperClassName?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-card border border-border bg-surface", wrapperClassName)}>
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("border-b border-border bg-sunken/60 text-xs text-muted", className)} {...props} />;
}

export function TBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-border", className)} {...props} />;
}

export function TR({ className, selected, ...props }: ComponentProps<"tr"> & { selected?: boolean }) {
  return <tr aria-selected={selected || undefined} className={cn("transition-colors duration-150 hover:bg-ink/[0.02]", selected && "bg-accent/8", className)} {...props} />;
}

/** Header cell. Pass `sort` plus `sortHref` (server) or `onSort` (client) to make it sortable. */
export function TH({
  className,
  children,
  sort,
  sortHref,
  onSort,
  align = "left",
  ...props
}: ComponentProps<"th"> & { sort?: "asc" | "desc" | null; sortHref?: string; onSort?: () => void; align?: "left" | "right" | "center" }) {
  const sortable = sort !== undefined && (sortHref || onSort);
  const Icon = sort === "asc" ? ArrowUp : sort === "desc" ? ArrowDown : ArrowUpDown;
  const inner = sortable ? (
    sortHref ? (
      <a href={sortHref} className="inline-flex items-center gap-1 hover:text-ink">
        {children}
        <Icon className="size-3.5" aria-hidden />
      </a>
    ) : (
      <button type="button" onClick={onSort} className="inline-flex items-center gap-1 hover:text-ink">
        {children}
        <Icon className="size-3.5" aria-hidden />
      </button>
    )
  ) : (
    children
  );
  return (
    <th
      scope="col"
      aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined}
      className={cn("h-11 px-4 font-medium whitespace-nowrap", align === "right" && "text-right", align === "center" && "text-center", className)}
      {...props}
    >
      {inner}
    </th>
  );
}

export function TD({ className, align = "left", ...props }: ComponentProps<"td"> & { align?: "left" | "right" | "center" }) {
  return <td className={cn("h-14 px-4 align-middle", align === "right" && "text-right tabular-nums", align === "center" && "text-center", className)} {...props} />;
}

export function Pagination({ page, pageCount, hrefFor, className, locale = "en" }: { page: number; pageCount: number; hrefFor: (page: number) => string; className?: string; locale?: Locale }) {
  if (pageCount <= 1) return null;
  const t = uiMessages[locale];
  const link = "grid size-9 place-items-center rounded-input border border-border bg-surface hover:border-ink/40 aria-disabled:pointer-events-none aria-disabled:opacity-40";
  return (
    <nav aria-label={t.pagination} className={cn("flex items-center justify-end gap-2 text-sm", className)}>
      <a href={hrefFor(page - 1)} aria-disabled={page <= 1} className={link} aria-label={t.previousPage}>
        <ChevronLeft className="size-4" aria-hidden />
      </a>
      <span className="px-2 tabular-nums text-muted">{t.pageOf(page, pageCount)}</span>
      <a href={hrefFor(page + 1)} aria-disabled={page >= pageCount} className={link} aria-label={t.nextPage}>
        <ChevronRight className="size-4" aria-hidden />
      </a>
    </nav>
  );
}

// --- Stat card -----------------------------------------------------------------

export function StatCard({
  label,
  value,
  delta,
  icon,
  footer,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  /** e.g. { value: "+12%", trend: "up", label: "vs last week" } */
  delta?: { value: string; trend: "up" | "down" | "flat"; label?: string };
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2 rounded-card border border-border bg-surface p-5", className)}>
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span>{label}</span>
        {icon && <span className="text-muted [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {delta && (
        <p className="flex items-center gap-1 text-xs">
          <span className={cn("inline-flex items-center gap-0.5 font-medium", delta.trend === "up" ? "text-success" : delta.trend === "down" ? "text-danger" : "text-muted")}>
            {delta.trend === "up" ? <ArrowUp className="size-3" aria-hidden /> : delta.trend === "down" ? <ArrowDown className="size-3" aria-hidden /> : null}
            {delta.value}
          </span>
          {delta.label && <span className="text-muted">{delta.label}</span>}
        </p>
      )}
      {footer}
    </div>
  );
}

// --- Charts (dependency-free SVG) ---------------------------------------------------

export interface ChartPoint {
  label: string;
  value: number;
}

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/** Bar chart with an accessible table fallback. `format` renders axis and tooltip values. */
export function BarChart({ data, format = String, height = 220, label, className }: { data: ChartPoint[]; format?: (n: number) => string; height?: number; label: string; className?: string }) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const w = 100 / Math.max(1, data.length);
  return (
    <figure className={cn("grid gap-2", className)}>
      <div className="relative" style={{ height }}>
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-muted tabular-nums">{format(max * f)}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end pr-12" aria-hidden>
          {data.map((d) => (
            <div key={d.label} className="group relative flex h-full items-end justify-center" style={{ width: `${w}%` }}>
              <div className="w-[62%] max-w-10 rounded-t-[4px] bg-accent transition-[filter] duration-150 group-hover:brightness-90" style={{ height: `${(d.value / max) * 100}%` }} />
              <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[10px] whitespace-nowrap text-bg group-hover:block">
                {format(d.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex pr-12 text-[10px] text-muted" aria-hidden>
        {data.map((d, i) => (
          <span key={d.label} className="truncate text-center" style={{ width: `${w}%` }}>
            {data.length > 14 && i % Math.ceil(data.length / 7) !== 0 ? "" : d.label}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        {label}:{" "}
        {data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}
      </figcaption>
    </figure>
  );
}

export function LineChart({ data, format = String, height = 220, label, className }: { data: ChartPoint[]; format?: (n: number) => string; height?: number; label: string; className?: string }) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const pts = data.map((d, i) => [data.length === 1 ? 50 : (i / (data.length - 1)) * 100, 100 - (d.value / max) * 100] as const);
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  return (
    <figure className={cn("grid gap-2", className)}>
      <div className="relative pr-12" style={{ height }}>
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-muted tabular-nums">{format(max * f)}</span>
          </div>
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-[calc(100%-3rem)] overflow-visible" aria-hidden>
          <path d={`${path} L100,100 L0,100 Z`} fill="var(--sb-accent)" opacity="0.15" />
          <path d={path} fill="none" stroke="var(--sb-ink)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="flex justify-between pr-12 text-[10px] text-muted" aria-hidden>
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      <figcaption className="sr-only">
        {label}:{" "}
        {data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}
      </figcaption>
    </figure>
  );
}

// --- Timeline and stepper ------------------------------------------------------------

export interface TimelineStep {
  label: ReactNode;
  detail?: ReactNode;
  state: "done" | "current" | "upcoming";
}

/** Order tracking (Paid → At lab → Shipped → Delivered) and message schedules. */
export function Timeline({ steps, orientation = "vertical", className, locale = "en" }: { steps: TimelineStep[]; orientation?: "vertical" | "horizontal"; className?: string; locale?: Locale }) {
  const t = uiMessages[locale];
  const dot = (s: TimelineStep) => (
    <span
      className={cn(
        "relative z-10 grid size-6 shrink-0 place-items-center rounded-full border-2",
        s.state === "done" && "border-success bg-success text-white",
        s.state === "current" && "border-ink bg-accent",
        s.state === "upcoming" && "border-border bg-surface",
      )}
    >
      {s.state === "done" && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
    </span>
  );
  const stateText = (s: TimelineStep) => <span className="sr-only">{s.state === "done" ? t.stepDone : s.state === "current" ? t.stepCurrent : t.stepUpcoming}</span>;

  if (orientation === "horizontal") {
    return (
      <ol className={cn("grid", className)} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={i} className="relative grid justify-items-center gap-2 text-center">
            {i > 0 && <span className={cn("absolute top-3 right-1/2 h-0.5 w-full -translate-y-1/2", s.state === "upcoming" ? "bg-border" : "bg-success")} aria-hidden />}
            {dot(s)}
            <span className={cn("text-xs font-medium", s.state === "upcoming" && "text-muted")}>
              {stateText(s)}
              {s.label}
            </span>
            {s.detail && <span className="text-[11px] text-muted">{s.detail}</span>}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className={cn("grid", className)}>
      {steps.map((s, i) => (
        <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && <span className={cn("absolute top-6 bottom-0 left-3 w-0.5 -translate-x-1/2", steps[i + 1]!.state === "upcoming" ? "bg-border" : "bg-success")} aria-hidden />}
          {dot(s)}
          <div className="grid gap-0.5 pt-0.5">
            <span className={cn("text-sm font-medium", s.state === "upcoming" && "text-muted")}>
              {stateText(s)}
              {s.label}
            </span>
            {s.detail && <span className="text-xs text-muted">{s.detail}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Wizard progress (onboarding, new job). */
export function Stepper({ steps, current, className, locale = "en" }: { steps: string[]; current: number; className?: string; locale?: Locale }) {
  const t = uiMessages[locale];
  return (
    <ol className={cn("flex items-center gap-2 overflow-x-auto text-sm", className)} aria-label={t.progress}>
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li key={label} className="flex shrink-0 items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full text-xs font-semibold",
                state === "done" && "bg-success text-white",
                state === "current" && "bg-ink text-bg",
                state === "upcoming" && "border border-border text-muted",
              )}
            >
              {state === "done" ? <Check className="size-3.5" strokeWidth={3} aria-label={t.done} /> : i + 1}
            </span>
            <span className={cn("hidden md:inline", state === "upcoming" ? "text-muted" : "font-medium")}>{label}</span>
            {i < steps.length - 1 && <span className="h-px w-6 bg-border md:w-10" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
