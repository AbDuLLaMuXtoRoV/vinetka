import type { Locale } from "@snapbell/sdk";
import { cn } from "@snapbell/ui/lib/cn";
import { Images, ShoppingBag, ShoppingCart, User } from "lucide-react";
import type { ReactNode } from "react";
import { commonMsgs } from "@site/messages/common";

/** A phone drawn in CSS. Children are the screen. Safe to use from client islands. */
export function PhoneFrame({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <figure className={cn("relative mx-auto w-[17.5rem] shrink-0", className)} aria-label={label}>
      <div className="relative overflow-hidden rounded-[2.75rem] border-[10px] border-ink bg-surface shadow-overlay" style={{ aspectRatio: "9 / 19" }}>
        <div className="absolute top-2 left-1/2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" aria-hidden />
        <div className="absolute inset-0 overflow-hidden">{children}</div>
      </div>
    </figure>
  );
}

export function StoreTabBar({ locale, active }: { locale: Locale; active: "photos" | "shop" | "cart" | "account" }) {
  const t = commonMsgs[locale].phone.tabs;
  const tabs = [
    { key: "photos", label: t.photos, Icon: Images },
    { key: "shop", label: t.shop, Icon: ShoppingBag },
    { key: "cart", label: t.cart, Icon: ShoppingCart },
    { key: "account", label: t.account, Icon: User },
  ] as const;
  return (
    <div className="grid grid-cols-4 border-t border-border bg-surface px-2 pt-1.5 pb-3 text-[9px]" aria-hidden>
      {tabs.map(({ key, label, Icon }) => (
        <span key={key} className={cn("grid justify-items-center gap-0.5", key === active ? "font-semibold text-ink" : "text-muted")}>
          <Icon className="size-4" />
          {label}
        </span>
      ))}
    </div>
  );
}
