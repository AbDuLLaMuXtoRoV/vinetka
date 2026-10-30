"use client";

import { cn } from "@snapbell/ui/lib/cn";
import { useMessages } from "@snapbell/ui/locale";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { jobsMsgs } from "@/messages/jobs";

const TABS = [
  { href: "", key: "overview" },
  { href: "/roster", key: "roster" },
  { href: "/photos", key: "photos" },
  { href: "/matching", key: "matching" },
  { href: "/settings", key: "settings" },
  { href: "/marketing", key: "marketing" },
  { href: "/orders", key: "orders" },
  { href: "/exports", key: "exports" },
] as const;

export function JobTabs({ jobId, reviewCount }: { jobId: string; reviewCount: number }) {
  const pathname = usePathname();
  const labels = useMessages(jobsMsgs).tabs;
  const base = `/jobs/${jobId}`;
  return (
    <nav aria-label={labels.nav} className="-mx-4 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0 print:hidden">
      <ul className="flex gap-1">
        {TABS.map((t) => {
          const href = base + t.href;
          const active = t.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <li key={t.href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm whitespace-nowrap transition-colors",
                  active ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {labels[t.key]}
                {t.href === "/matching" && reviewCount > 0 && (
                  <span className="rounded-full bg-warning/15 px-1.5 text-xs font-medium text-warning-ink">
                    {reviewCount}
                    <span className="sr-only"> {labels.toReview}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
