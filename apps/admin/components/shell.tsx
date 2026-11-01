"use client";

import { cn } from "@snapbell/ui/lib/cn";
import { LanguageSwitcher, useMessages } from "@snapbell/ui/locale";
import { Briefcase, Flag, FlaskConical, Inbox, LogOut, MessageSquare, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/actions";
import { adminMsgs } from "@/messages/admin";
import { onboardingMsgs } from "@/messages/onboarding";

const NAV = [
  { href: "/requests", key: "requests", icon: Inbox },
  { href: "/studios", key: "studios", icon: Store },
  { href: "/jobs", key: "jobs", icon: Briefcase },
  { href: "/orders", key: "orders", icon: ShoppingBag },
  { href: "/lab-queue", key: "labQueue", icon: FlaskConical },
  { href: "/messages", key: "messages", icon: MessageSquare },
  { href: "/flags", key: "flags", icon: Flag },
] as const;

export function AdminShell({ email, newRequests, children }: { email: string; newRequests: number; children: ReactNode }) {
  const pathname = usePathname();
  const t = useMessages(adminMsgs);
  const o = useMessages(onboardingMsgs);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="flex flex-col gap-4 border-b border-border bg-ink p-4 text-bg lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-input bg-accent text-sm font-bold text-accent-ink" aria-hidden>
              S
            </span>
            {t.appName}
          </span>
          <span className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">{t.internal}</span>
        </div>
        <nav aria-label={t.nav.label} className="-mx-1 flex gap-1 overflow-x-auto lg:mx-0 lg:grid lg:overflow-visible">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-10 shrink-0 items-center gap-2.5 rounded-input px-3 text-sm whitespace-nowrap", active ? "bg-bg/15 font-medium" : "opacity-75 hover:bg-bg/10 hover:opacity-100")}
              >
                <Icon className="size-4" aria-hidden />
                {n.key === "requests" ? o.navRequests : t.nav[n.key]}
                {n.key === "requests" && newRequests > 0 && (
                  <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-ink tabular-nums" aria-label={o.newRequests(newRequests)}>
                    {newRequests}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between gap-3 lg:mt-auto lg:grid lg:justify-stretch">
          <LanguageSwitcher className="lg:w-full lg:[&>select]:w-full" />
          <span className="hidden truncate text-xs opacity-70 lg:block">{email}</span>
          <form action={logoutAction}>
            <button type="submit" className="inline-flex items-center gap-2 text-xs opacity-75 hover:opacity-100">
              <LogOut className="size-4" aria-hidden /> {t.logOut}
            </button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}

export function AdminHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
