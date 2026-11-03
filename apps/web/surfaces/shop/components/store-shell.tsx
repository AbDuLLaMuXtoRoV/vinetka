import type { StudioBranding } from "@snapbell/sdk";
import { brandStyle } from "@snapbell/ui/lib/brand";
import { initials } from "@snapbell/ui/lib/format";
import { LanguageSwitcher } from "@snapbell/ui/locale";
import Link from "next/link";
import type { ReactNode } from "react";
import { getLocale } from "@shop/lib/i18n";
import { serverMsgs } from "@shop/messages/server";
import { BottomTabs, TopNav } from "./store-nav";

/**
 * Family Store chrome: studio logo + name on top, bottom tab bar on mobile
 * (Photos, Shop, Cart, Account), inline nav on wider screens.
 * The studio's brand color replaces the accent token for the whole page.
 */
export async function StoreShell({
  code,
  studio,
  cartCount,
  children,
}: {
  code: string | null;
  studio: StudioBranding | null;
  cartCount: number;
  children: ReactNode;
}) {
  const t = serverMsgs[await getLocale()].shell;
  const brand = brandStyle(studio?.brandColor) as Record<string, string>;
  // Also set on :root so portalled sheets and dialogs pick up the studio accent.
  const rootBrand = brand["--sb-accent"]
    ? `:root{--sb-accent:${brand["--sb-accent"]};--sb-accent-ink:${brand["--sb-accent-ink"]}}`
    : null;

  return (
    <div style={brand} className="min-h-dvh bg-bg pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      {rootBrand && <style>{rootBrand}</style>}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-input focus:bg-surface focus:px-4 focus:py-2">
        {t.skip}
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-content items-center justify-between gap-4 px-4">
          <Link href={code ? `/shop/a/${code}` : "/shop"} className="flex min-w-0 items-center gap-2.5 font-semibold">
            {studio?.logoUrl ? (
              <img src={studio.logoUrl} alt="" className="h-8 w-auto max-w-28 object-contain" />
            ) : (
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink" aria-hidden>
                {initials(studio?.name ?? t.yourPhotos)}
              </span>
            )}
            <span className="truncate">{studio?.name ?? t.yourPhotos}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <TopNav code={code} cartCount={cartCount} />
            <LanguageSwitcher variant="pills" />
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <BottomTabs code={code} cartCount={cartCount} />
    </div>
  );
}
