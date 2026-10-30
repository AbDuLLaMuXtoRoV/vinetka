import type { Locale } from "@snapbell/sdk";
import { cn } from "@snapbell/ui/lib/cn";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { commonMsgs } from "@/messages/common";

/** Fictional lab wordmarks; real partner logos go here once agreements are signed. */
const LABS = ["Cascade Pro Lab", "Northstar Imaging", "Harbor Print Works", "Meridian Color", "Bluebird Lab"];

export function LogoStrip({ locale, note }: { locale: Locale; note?: ReactNode }) {
  const t = commonMsgs[locale].blocks;
  return (
    <div className="grid gap-6">
      <p className="text-center text-sm text-muted">{t.labsTitle}</p>
      <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4" aria-label={t.labsAria}>
        {LABS.map((lab, i) => (
          <li key={lab} className={cn("text-lg font-semibold tracking-tight text-muted", i % 2 ? "font-display italic" : "uppercase tracking-[0.18em] text-sm")}>
            {lab}
          </li>
        ))}
      </ul>
      {note && <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">{note}</div>}
    </div>
  );
}

export function StepList({ locale, steps }: { locale: Locale; steps: Array<{ icon: LucideIcon; title: string; body: string }> }) {
  const t = commonMsgs[locale].blocks;
  return (
    <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className="relative grid content-start gap-3 rounded-card border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <span className="grid size-11 place-items-center rounded-input bg-accent text-accent-ink">
              <s.icon className="size-5" aria-hidden />
            </span>
            <span className="font-display text-2xl text-muted/50" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
          <h3 className="text-lg font-semibold">
            <span className="sr-only">{t.step(i + 1)}</span>
            {s.title}
          </h3>
          <p className="text-muted">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function CheckList({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={cn("grid gap-3", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success text-white">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Image + copy block; `reverse` flips sides on desktop. */
export function FeatureBlock({
  id,
  eyebrow,
  title,
  body,
  bullets,
  href,
  linkLabel,
  media,
  reverse,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  body: ReactNode;
  bullets?: string[];
  href?: string;
  /** Required with `href`: the link text in the page's language. */
  linkLabel?: string;
  media: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div id={id} className="grid scroll-mt-32 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn("grid content-start gap-5", reverse && "lg:order-2")}>
        {eyebrow && <p className="text-sm font-semibold tracking-wide text-sage uppercase">{eyebrow}</p>}
        <h3 className="font-display text-2xl text-balance">{title}</h3>
        <div className="text-lg text-muted">{body}</div>
        {bullets && <CheckList items={bullets} />}
        {href && (
          <Link href={href} className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold underline decoration-2 underline-offset-4 hover:no-underline">
            {linkLabel} <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      <div className={cn(reverse && "lg:order-1")}>{media}</div>
    </div>
  );
}

/** Rounded media panel used beside feature copy. */
export function MediaPanel({ children, className, tone = "sage" }: { children: ReactNode; className?: string; tone?: "sage" | "accent" | "sunken" }) {
  return (
    <div
      className={cn(
        "relative grid min-h-80 place-items-center overflow-hidden rounded-sheet p-8",
        tone === "sage" && "bg-sage/15",
        tone === "accent" && "bg-accent/20",
        tone === "sunken" && "bg-sunken",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CaseStudyCard({ locale, studio, metric, metricLabel, story, market }: { locale: Locale; studio: string; metric: string; metricLabel: string; story: string; market: string }) {
  return (
    <article className="grid content-start gap-4 rounded-card border border-border bg-surface p-6">
      <p className="text-sm font-medium text-muted">
        {studio} · {market}
      </p>
      <p>
        <span className="block font-display text-3xl">{metric}</span>
        <span className="text-sm font-semibold">{metricLabel}</span>
      </p>
      <p className="text-muted">{story}</p>
      <p className="text-xs text-muted">{commonMsgs[locale].blocks.caseNote}</p>
    </article>
  );
}

/** Simple SMS conversation bubbles. */
export function SmsBubbles({ locale, messages, className }: { locale: Locale; messages: Array<{ from: "studio" | "parent"; text: string; time?: string }>; className?: string }) {
  return (
    <div className={cn("grid w-full max-w-sm gap-2 rounded-card bg-surface p-4 shadow-overlay", className)} role="img" aria-label={commonMsgs[locale].blocks.smsAria}>
      {messages.map((m, i) => (
        <div key={i} className={cn("grid max-w-[85%] gap-0.5", m.from === "parent" ? "justify-self-end" : "justify-self-start")}>
          <p className={cn("rounded-2xl px-3.5 py-2 text-sm", m.from === "parent" ? "rounded-br-sm bg-ink text-bg" : "rounded-bl-sm bg-sunken text-ink")}>{m.text}</p>
          {m.time && <span className={cn("text-[11px] text-muted", m.from === "parent" && "text-right")}>{m.time}</span>}
        </div>
      ))}
    </div>
  );
}
