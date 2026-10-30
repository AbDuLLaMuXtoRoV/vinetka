"use client";

import { ChevronDown } from "lucide-react";
import { Accordion as A, Tabs as T } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn";

// --- Tabs --------------------------------------------------------------------

export const Tabs = T.Root;

export function TabsList({ className, variant = "pill", ...props }: ComponentProps<typeof T.List> & { variant?: "pill" | "underline" }) {
  return (
    <T.List
      className={cn(
        "flex gap-1 overflow-x-auto [scrollbar-width:none]",
        variant === "pill" ? "rounded-input bg-sunken p-1" : "border-b border-border",
        className,
      )}
      data-variant={variant}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-4 text-sm font-medium whitespace-nowrap text-muted transition-colors duration-150 hover:text-ink md:min-h-9 [&_svg]:size-4",
        "[[data-variant=pill]_&]:rounded-[6px] [[data-variant=pill]_&]:data-[state=active]:bg-surface [[data-variant=pill]_&]:data-[state=active]:text-ink [[data-variant=pill]_&]:data-[state=active]:shadow-sm",
        "[[data-variant=underline]_&]:-mb-px [[data-variant=underline]_&]:border-b-2 [[data-variant=underline]_&]:border-transparent [[data-variant=underline]_&]:data-[state=active]:border-ink [[data-variant=underline]_&]:data-[state=active]:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof T.Content>) {
  return <T.Content className={cn("mt-6 focus-visible:outline-none", className)} {...props} />;
}

// --- Accordion (FAQ) -----------------------------------------------------------

export function FaqAccordion({ items, className }: { items: Array<{ question: string; answer: ReactNode }>; className?: string }) {
  return (
    <A.Root type="multiple" className={cn("divide-y divide-border border-y border-border", className)}>
      {items.map((item, i) => (
        <A.Item key={i} value={`q${i}`}>
          <A.Header>
            <A.Trigger className="group flex w-full items-center justify-between gap-4 py-5 text-left text-base font-medium">
              {item.question}
              <ChevronDown className="size-5 shrink-0 text-muted transition-transform duration-250 group-data-[state=open]:rotate-180" aria-hidden />
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden pr-8 pb-5 text-muted">{item.answer}</A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
