"use client";

import { cn } from "@snapbell/ui/lib/cn";
import { useMessages } from "@snapbell/ui/locale";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsMsgs } from "@/messages/settings";

export function SettingsTabs({ showPayments }: { showPayments: boolean }) {
  const pathname = usePathname();
  const t = useMessages(settingsMsgs);
  const tabs = [{ href: "/settings/studio", label: t.tabStudio }, ...(showPayments ? [{ href: "/settings/payments", label: t.tabPayments }] : [])];
  return (
    <nav aria-label={t.sections} className="border-b border-border">
      <ul className="flex gap-1">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={pathname === tab.href ? "page" : undefined}
              className={cn("-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm", pathname === tab.href ? "border-ink font-medium" : "border-transparent text-muted hover:text-ink")}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
