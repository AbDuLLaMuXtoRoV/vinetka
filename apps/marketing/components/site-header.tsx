import { DEMO_CODES, type Locale } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Images } from "lucide-react";
import Link from "next/link";
import { env } from "@/lib/env";
import { localePath, withLang } from "@/lib/i18n";
import { commonMsgs } from "@/messages/common";
import { DesktopNav, MobileNav } from "./header-nav";
import { Logo } from "./logo";

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = commonMsgs[locale];
  const loginUrl = withLang(`${env.studioUrl}/login`, locale);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center gap-2 px-4 md:px-6">
        <MobileNav loginUrl={loginUrl} />
        <Link href={localePath(locale, "/")} className="mr-4 rounded-input" aria-label={t.homeAria}>
          <Logo />
        </Link>
        <DesktopNav sampleStoreUrl={withLang(`${env.storeUrl}/a/${DEMO_CODES.personal}`, locale)} />
        <div className="ml-auto flex items-center gap-2">
          {/* Parents get a first-class entry point, not a thin top bar. */}
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link href={localePath(locale, "/find-my-photos")}>
              <Images aria-hidden /> {t.nav.findPhotos}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
            <a href={loginUrl}>{t.nav.login}</a>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href={localePath(locale, "/signup")}>{t.nav.startFree}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
