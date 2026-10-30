"use client";

import type { Member, Studio } from "@snapbell/sdk";
import { Avatar } from "@snapbell/ui/avatar";
import { Button } from "@snapbell/ui/button";
import { Menu as DropMenu, Sheet } from "@snapbell/ui/overlay";
import { readableInk } from "@snapbell/ui/lib/brand";
import { LanguageSwitcher, useMessages } from "@snapbell/ui/locale";
import { cn } from "@snapbell/ui/lib/cn";
import { ChevronsUpDown, LogOut, Menu, Settings, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/lib/actions";
import { useLabels } from "@/components/use-labels";
import { commonMsgs } from "@/messages/common";
import { navFor } from "./nav";

function Brand({ studio }: { studio: Studio }) {
  const t = useMessages(commonMsgs);
  return (
    <div className="flex min-w-0 items-center gap-3">
      {studio.logoUrl ? (
        <img src={studio.logoUrl} alt="" className="size-9 shrink-0 rounded-input object-cover" />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-input text-sm font-semibold" style={{ background: studio.brandColor, color: readableInk(studio.brandColor) }} aria-hidden>
          {studio.name.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{studio.name}</p>
        <p className="truncate text-xs text-muted">{t.appName}</p>
      </div>
    </div>
  );
}

function NavLinks({ member, onNavigate }: { member: Member; onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useMessages(commonMsgs);
  return (
    <nav aria-label={t.nav.main} className="grid gap-0.5">
      {navFor(member.role).map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/settings/studio" && pathname.startsWith("/settings"));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-input px-3 text-sm transition-colors duration-150",
              active ? "bg-ink text-bg" : "text-muted hover:bg-ink/6 hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {t.nav[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu({ member, storeUrl }: { member: Member; storeUrl: string }) {
  const t = useMessages(commonMsgs);
  const labels = useLabels();
  return (
    <DropMenu
      label={t.account}
      align="start"
      trigger={
        <button type="button" className="flex w-full items-center gap-3 rounded-input p-2 text-left hover:bg-ink/6">
          <Avatar name={member.name} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{member.name}</span>
            <span className="block truncate text-xs text-muted">{labels.roles[member.role]}</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted" aria-hidden />
        </button>
      }
      items={[
        { label: t.studioSettings, icon: <Settings />, href: "/settings/studio" },
        { label: t.openStore, icon: <Store />, href: storeUrl },
        null,
        { label: t.logOut, icon: <LogOut />, onSelect: () => void logoutAction() },
      ]}
    />
  );
}

/** Left sidebar from 1024px; top bar with a drawer below that. Hidden when printing. */
export function Shell({ member, studio, storeUrl, children }: { member: Member; studio: Studio; storeUrl: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useMessages(commonMsgs);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-surface p-4 lg:flex print:hidden">
        <Brand studio={studio} />
        <NavLinks member={member} />
        <div className="mt-auto grid gap-2">
          <LanguageSwitcher className="w-full [&>select]:w-full" />
          <UserMenu member={member} storeUrl={storeUrl} />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden print:hidden">
        <Brand studio={studio} />
        <Sheet
          side="left"
          open={open}
          onOpenChange={setOpen}
          title={t.menu}
          hideTitle
          trigger={
            <Button variant="ghost" size="icon" aria-label={t.openMenu}>
              <Menu />
            </Button>
          }
        >
          <div className="grid gap-6">
            <Brand studio={studio} />
            <NavLinks member={member} onNavigate={() => setOpen(false)} />
            <LanguageSwitcher className="w-full [&>select]:w-full" />
            <UserMenu member={member} storeUrl={storeUrl} />
          </div>
        </Sheet>
      </header>

      <main id="main" className="min-w-0 px-4 py-6 md:px-8 md:py-8 print:p-0">
        {children}
      </main>
    </div>
  );
}
