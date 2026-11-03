"use client";

import { Avatar } from "@snapbell/ui/avatar";
import { Button } from "@snapbell/ui/button";
import { useLocale } from "@snapbell/ui/locale";
import { Menu } from "@snapbell/ui/overlay";
import { ChevronDown, Images, LogOut, Package, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { signOutParent } from "@site/account-actions";
import { localePath } from "@site/lib/i18n";
import { readParentName, storeLink } from "@site/lib/parent-links";
import { accountMsgs } from "@site/messages/account";
import { commonMsgs } from "@site/messages/common";

/**
 * Signed-in state comes from a readable cookie, so every page stays statically
 * generated. Nothing renders until mounted, to avoid a flash of the wrong buttons.
 */
export function useParentName(): { mounted: boolean; name: string | null } {
  const [state, setState] = useState<{ mounted: boolean; name: string | null }>({ mounted: false, name: null });
  useEffect(() => setState({ mounted: true, name: readParentName() }), []);
  return state;
}

async function signOut() {
  await signOutParent();
  window.location.reload();
}

/** Header right side: Sign in / Sign up, or the parent's account menu. */
export function AccountSlot() {
  const locale = useLocale();
  const t = accountMsgs[locale];
  const nav = commonMsgs[locale].nav;
  const { mounted, name } = useParentName();
  if (!mounted) return null;

  if (!name) {
    return (
      <>
        <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
          <Link href={localePath(locale, "/signin")}>{nav.signIn}</Link>
        </Button>
        <Button asChild variant="primary" size="sm">
          <Link href={localePath(locale, "/signup")}>{nav.signUp}</Link>
        </Button>
      </>
    );
  }

  return (
    <Menu
      label={t.menu.label}
      trigger={
        <Button variant="outline" size="sm" className="max-w-56 gap-2 pl-1.5" aria-label={`${t.menu.label}: ${name}`}>
          <Avatar name={name} size={26} aria-hidden />
          <span className="hidden truncate md:inline" aria-hidden>
            {name}
          </span>
          <ChevronDown aria-hidden />
        </Button>
      }
      items={[
        { label: t.menu.account, icon: <UserRound aria-hidden />, href: storeLink(locale, "/account") },
        { label: t.menu.orders, icon: <Package aria-hidden />, href: storeLink(locale, "/account") },
        { label: t.menu.findPhotos, icon: <Images aria-hidden />, href: storeLink(locale, "/") },
        null,
        { label: t.menu.signOut, icon: <LogOut aria-hidden />, onSelect: () => void signOut() },
      ]}
    />
  );
}

/** The same choices for the mobile menu's footer. */
export function MobileAccountSlot() {
  const locale = useLocale();
  const t = accountMsgs[locale];
  const nav = commonMsgs[locale].nav;
  const { mounted, name } = useParentName();
  if (!mounted) return null;

  if (!name) {
    return (
      <div className="grid w-full gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{nav.forParents}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="primary" size="lg" block>
            <Link href={localePath(locale, "/signup")}>{nav.signUp}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" block>
            <Link href={localePath(locale, "/signin")}>{nav.signIn}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const row = "flex min-h-11 items-center gap-2 rounded-input px-3 text-base hover:bg-ink/5 [&_svg]:size-4 [&_svg]:text-muted";
  return (
    <div className="grid w-full gap-2">
      <div className="flex items-center gap-3 px-1">
        <Avatar name={name} size={32} />
        <span className="truncate font-medium">{name}</span>
      </div>
      <nav aria-label={t.menu.label} className="grid">
        <a href={storeLink(locale, "/account")} className={row}>
          <UserRound aria-hidden /> {t.menu.account}
        </a>
        <a href={storeLink(locale, "/account")} className={row}>
          <Package aria-hidden /> {t.menu.orders}
        </a>
        <a href={storeLink(locale, "/")} className={row}>
          <Images aria-hidden /> {t.menu.findPhotos}
        </a>
        <button type="button" onClick={() => void signOut()} className={row}>
          <LogOut aria-hidden /> {t.menu.signOut}
        </button>
      </nav>
    </div>
  );
}
