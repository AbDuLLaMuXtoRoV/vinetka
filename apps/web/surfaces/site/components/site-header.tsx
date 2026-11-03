import { DEMO_CODES, type Locale } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Images } from "lucide-react";
import Link from "next/link";
import { localePath } from "@site/lib/i18n";
import { storeLink } from "@site/lib/parent-links";
import { studioLoginUrl } from "@site/lib/site";
import { commonMsgs } from "@site/messages/common";
import { AccountSlot } from "./account/account-slot";
import { DesktopNav, MobileNav } from "./header-nav";
import { Logo } from "./logo";

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = commonMsgs[locale];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center gap-2 px-4 md:px-6">
        <MobileNav studioLoginUrl={studioLoginUrl(locale)} />
        <Link href={localePath(locale, "/")} className="mr-4 rounded-input" aria-label={t.homeAria}>
          <Logo />
        </Link>
        <DesktopNav sampleStoreUrl={storeLink(locale, `/a/${DEMO_CODES.personal}`)} />
        <div className="ml-auto flex items-center gap-2">
          {/* Parents: find photos by code, and their account (signed in on this site; the shop is one click away). */}
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link href={localePath(locale, "/find-my-photos")}>
              <Images aria-hidden /> {t.nav.findPhotos}
            </Link>
          </Button>
          <AccountSlot />
        </div>
      </div>
    </header>
  );
}
