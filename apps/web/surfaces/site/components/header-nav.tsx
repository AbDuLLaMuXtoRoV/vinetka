"use client";

import { Button } from "@snapbell/ui/button";
import { cn } from "@snapbell/ui/lib/cn";
import { LanguageSwitcher, useLocale } from "@snapbell/ui/locale";
import { Sheet } from "@snapbell/ui/overlay";
import { BookOpen, Camera, ChevronDown, CircleHelp, Images, LogIn, Megaphone, Menu, Repeat, ShoppingBag, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { canonicalPath, localePath } from "@site/lib/i18n";
import { productNav, resourcesNav, type ProductNavKey, type ResourceKey } from "@site/lib/site";
import { commonMsgs } from "@site/messages/common";
import { MobileAccountSlot } from "./account/account-slot";
import { useLocaleHrefs } from "./locale-hrefs";

const productIcons: Record<ProductNavKey, LucideIcon> = {
  "check-in": Camera,
  "family-store": ShoppingBag,
  marketing: Megaphone,
  markets: Images,
};
const resourceIcons: Record<ResourceKey, LucideIcon> = { blog: BookOpen, help: CircleHelp, switch: Repeat };

type MenuKey = "product" | "resources";

/** Desktop navigation with the Product and Resources mega-menus. */
export function DesktopNav({ sampleStoreUrl }: { sampleStoreUrl: string }) {
  const locale = useLocale();
  const t = commonMsgs[locale].nav;
  const [open, setOpen] = useState<MenuKey | null>(null);
  const pathname = canonicalPath(usePathname());
  const ref = useRef<HTMLDivElement>(null);
  const productId = useId();
  const resourcesId = useId();
  const pricingHref = localePath(locale, "/pricing");
  const contactHref = localePath(locale, "/contact");

  useEffect(() => setOpen(null), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const trigger = (key: MenuKey, label: string, panelId: string) => (
    <button
      type="button"
      aria-expanded={open === key}
      aria-controls={panelId}
      onClick={() => setOpen(open === key ? null : key)}
      className={cn(
        "inline-flex h-11 items-center gap-1 rounded-input px-3 text-sm font-medium transition-colors duration-150 hover:bg-ink/5",
        open === key && "bg-ink/5",
      )}
    >
      {label}
      <ChevronDown className={cn("size-4 transition-transform duration-150", open === key && "rotate-180")} aria-hidden />
    </button>
  );

  const linkClass = (href: string) =>
    cn(
      "inline-flex h-11 items-center rounded-input px-3 text-sm font-medium transition-colors duration-150 hover:bg-ink/5",
      pathname.startsWith(href) && "underline decoration-2 underline-offset-8",
    );

  return (
    <div ref={ref} className="relative hidden items-center gap-1 lg:flex">
      {trigger("product", t.product, productId)}
      <Link href={pricingHref} className={linkClass(pricingHref)} aria-current={pathname === pricingHref ? "page" : undefined}>
        {t.pricing}
      </Link>
      {trigger("resources", t.resources, resourcesId)}
      <Link href={contactHref} className={linkClass(contactHref)} aria-current={pathname === contactHref ? "page" : undefined}>
        {t.contact}
      </Link>

      <div
        id={productId}
        hidden={open !== "product"}
        className="absolute top-full left-0 mt-2 w-[min(44rem,calc(100vw-2rem))] animate-pop-in rounded-card border border-border bg-surface p-3 shadow-overlay"
      >
        <div className="grid grid-cols-[1fr_15rem] gap-3">
          <ul className="grid gap-1">
            {productNav(locale).map((item) => {
              const Icon = productIcons[item.key];
              return (
                <li key={item.href}>
                  <Link href={item.href} className="flex gap-3 rounded-input p-3 transition-colors duration-150 hover:bg-ink/5" aria-current={pathname === item.href ? "page" : undefined}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-input bg-accent text-accent-ink">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="grid gap-0.5">
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span className="text-sm text-muted">{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="grid content-between gap-3 rounded-input bg-sunken p-4">
            <div className="grid gap-1">
              <p className="text-sm font-semibold">{t.sampleTitle}</p>
              <p className="text-sm text-muted">{t.sampleBody}</p>
            </div>
            <Button asChild size="sm" variant="secondary" className="h-auto min-h-9 py-2 whitespace-normal">
              <a href={sampleStoreUrl}>{t.sampleButton}</a>
            </Button>
            <Link href={localePath(locale, "/features")} className="text-sm font-medium underline underline-offset-4 hover:no-underline">
              {t.allFeatures}
            </Link>
          </div>
        </div>
      </div>

      <div
        id={resourcesId}
        hidden={open !== "resources"}
        className="absolute top-full left-28 mt-2 w-[min(24rem,calc(100vw-2rem))] animate-pop-in rounded-card border border-border bg-surface p-3 shadow-overlay"
      >
        <ul className="grid gap-1">
          {resourcesNav(locale).map((item) => {
            const Icon = resourceIcons[item.key];
            return (
              <li key={item.href}>
                <Link href={item.href} className="flex gap-3 rounded-input p-3 transition-colors duration-150 hover:bg-ink/5">
                  <Icon className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
                  <span className="grid gap-0.5">
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="text-sm text-muted">{item.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Mobile hamburger menu: parent entry points (find photos, account) pinned at the top and bottom. */
export function MobileNav({ studioLoginUrl }: { studioLoginUrl: string }) {
  const locale = useLocale();
  const t = commonMsgs[locale].nav;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const hrefs = useLocaleHrefs();
  useEffect(() => setOpen(false), [pathname]);

  const item = "flex min-h-11 items-center rounded-input px-3 text-base hover:bg-ink/5";
  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <Sheet
        side="left"
        open={open}
        onOpenChange={setOpen}
        title={t.menu}
        hideTitle
        trigger={
          <Button variant="ghost" size="icon" aria-label={t.openMenu}>
            <Menu className="size-6" aria-hidden />
          </Button>
        }
        footer={<MobileAccountSlot />}
      >
        <nav aria-label={t.main} className="grid gap-6">
          <Button asChild variant="outline" size="lg" block>
            <Link href={localePath(locale, "/find-my-photos")} onClick={close}>
              <Images aria-hidden /> {t.findPhotos}
            </Link>
          </Button>
          <LanguageSwitcher variant="pills" hrefs={hrefs} className="w-fit" />
          <div className="grid gap-1">
            <p className="px-3 text-xs font-semibold tracking-wide text-muted uppercase">{t.product}</p>
            <Link href={localePath(locale, "/features")} className={item} onClick={close}>
              {t.allFeatures}
            </Link>
            {productNav(locale).map((p) => (
              <Link key={p.href} href={p.href} className={item} onClick={close}>
                {p.label}
              </Link>
            ))}
          </div>
          <Link href={localePath(locale, "/pricing")} className={cn(item, "font-medium")} onClick={close}>
            {t.pricing}
          </Link>
          <div className="grid gap-1">
            <p className="px-3 text-xs font-semibold tracking-wide text-muted uppercase">{t.resources}</p>
            {resourcesNav(locale).map((r) => (
              <Link key={r.href} href={r.href} className={item} onClick={close}>
                {r.label}
              </Link>
            ))}
            <Link href={localePath(locale, "/about")} className={item} onClick={close}>
              {t.about}
            </Link>
          </div>
          <div className="grid gap-1">
            <p className="px-3 text-xs font-semibold tracking-wide text-muted uppercase">{t.forStudios}</p>
            <Link href={localePath(locale, "/contact")} className={cn(item, "font-medium")} onClick={close}>
              {t.partner}
            </Link>
            <a href={studioLoginUrl} className={cn(item, "gap-2")}>
              <LogIn className="size-4 text-muted" aria-hidden /> {t.studioLogin}
            </a>
          </div>
        </nav>
      </Sheet>
    </div>
  );
}
