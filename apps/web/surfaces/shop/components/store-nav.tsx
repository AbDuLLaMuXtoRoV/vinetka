"use client";

import { cn } from "@snapbell/ui/lib/cn";
import { useMessages } from "@snapbell/ui/locale";
import { Images, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navMsgs } from "@shop/messages/nav";

function useTabs(code: string | null) {
  const pathname = usePathname();
  const t = useMessages(navMsgs);
  const album = code ? `/shop/a/${code}` : "/shop";
  const tabs = [
    { id: "photos", href: album, label: t.photos, icon: Images, active: pathname === album || pathname.includes("/photo/") || pathname.endsWith("/find-me") },
    { id: "shop", href: code ? `${album}/shop` : "/shop", label: t.shop, icon: ShoppingBag, active: /^\/shop\/a\/[^/]+\/shop$/.test(pathname) || pathname.includes("/customize/") },
    { id: "cart", href: "/shop/cart", label: t.cart, icon: ShoppingCart, active: pathname === "/shop/cart" || pathname === "/shop/checkout" },
    { id: "account", href: "/shop/account", label: t.account, icon: UserRound, active: pathname === "/shop/account" || pathname.startsWith("/shop/orders/") },
  ];
  return { tabs, t };
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-ink tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function BottomTabs({ code, cartCount }: { code: string | null; cartCount: number }) {
  const { tabs, t } = useTabs(code);
  return (
    <nav
      aria-label={t.label}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", tab.active ? "text-ink" : "text-muted")}
            >
              <span className="relative">
                <tab.icon className={cn("size-6", tab.active && "stroke-[2.25]")} aria-hidden />
                {tab.id === "cart" && <CountBadge count={cartCount} />}
              </span>
              {tab.label}
              {tab.id === "cart" && cartCount > 0 && <span className="sr-only">{t.cartItems(cartCount)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function TopNav({ code, cartCount }: { code: string | null; cartCount: number }) {
  const { tabs, t } = useTabs(code);
  return (
    <nav aria-label={t.label} className="hidden md:block">
      <ul className="flex items-center gap-1">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-10 items-center gap-2 rounded-input px-3 text-sm font-medium transition-colors duration-150 hover:bg-ink/5",
                tab.active ? "text-ink" : "text-muted",
              )}
            >
              <span className="relative">
                <tab.icon className="size-4" aria-hidden />
                {tab.id === "cart" && <CountBadge count={cartCount} />}
              </span>
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
