import { cn } from "@snapbell/ui/lib/cn";
import type { ReactNode } from "react";

export function Section({
  id,
  className,
  innerClassName,
  tone = "default",
  labelledBy,
  children,
}: {
  id?: string;
  className?: string;
  innerClassName?: string;
  tone?: "default" | "sunken" | "surface";
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("scroll-mt-28 px-4 py-16 md:px-6 md:py-24", tone === "sunken" && "bg-sunken", tone === "surface" && "bg-surface", className)}
    >
      <div className={cn("mx-auto max-w-content", innerClassName)}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm font-semibold tracking-wide text-sage uppercase", className)}>{children}</p>;
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  align = "left",
  className,
}: {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("grid max-w-3xl gap-4", align === "center" && "mx-auto justify-items-center text-center", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 id={id} className="font-display text-2xl text-balance md:text-3xl">
        {title}
      </h2>
      {lead && <p className="text-lg text-muted text-pretty">{lead}</p>}
    </div>
  );
}

/** Page-level hero for inner pages. */
export function PageHero({ eyebrow, title, lead, children, aside }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; children?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="px-4 pt-12 pb-12 md:px-6 md:pt-20 md:pb-16">
      <div className={cn("mx-auto grid max-w-content gap-10", aside && "lg:grid-cols-[1.1fr_1fr] lg:items-center")}>
        <div className="grid content-start gap-5">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="font-display text-2xl text-balance md:text-3xl lg:text-4xl">{title}</h1>
          {lead && <p className="max-w-2xl text-lg text-muted text-pretty">{lead}</p>}
          {children}
        </div>
        {aside}
      </div>
    </section>
  );
}
