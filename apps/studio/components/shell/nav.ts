import type { Role } from "@snapbell/sdk";
import { Briefcase, Building2, ChartColumn, House, ReceiptText, Settings, ShoppingBag, TicketPercent, type LucideIcon } from "lucide-react";
import type { commonMsgs } from "@/messages/common";

export interface NavItem {
  href: string;
  /** Key into commonMsgs.nav for the translated label. */
  key: keyof (typeof commonMsgs)["en"]["nav"];
  icon: LucideIcon;
  /** Roles that can see it; undefined means everyone. */
  roles?: Role[];
}

export const NAV: NavItem[] = [
  { href: "/home", key: "home", icon: House },
  { href: "/jobs", key: "jobs", icon: Briefcase },
  { href: "/price-sheets", key: "priceSheets", icon: ReceiptText, roles: ["owner", "admin"] },
  { href: "/orders", key: "orders", icon: ShoppingBag },
  { href: "/promos", key: "promos", icon: TicketPercent, roles: ["owner", "admin"] },
  { href: "/reports", key: "reports", icon: ChartColumn, roles: ["owner", "admin"] },
  { href: "/organizations", key: "organizations", icon: Building2 },
  { href: "/settings/studio", key: "settings", icon: Settings },
];

export function navFor(role: Role): NavItem[] {
  return NAV.filter((item) => !item.roles || item.roles.includes(role));
}
