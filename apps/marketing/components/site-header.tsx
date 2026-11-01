import { DEMO_CODES, type Locale } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Images } from "lucide-react";
import Link from "next/link";
import { env } from "@/lib/env";
import { localePath, withLang } from "@/lib/i18n";
import { shopSignInUrl, shopSignUpUrl, studioLoginUrl } from "@/lib/site";
import { commonMsgs } from "@/messages/common";
import { DesktopNav, MobileNav } from "./header-nav";
import { Logo } from "./logo";

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = commonMsgs[locale];
  const signInUrl = shopSignInUrl(locale);
  const signUpUrl = shopSignUpUrl(locale);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-content items-center gap-2 px-4 md:px-6">
        <MobileNav signInUrl={signInUrl} signUpUrl={signUpUrl} studioLoginUrl={studioLoginUrl(locale)} />
        <Link href={localePath(locale, "/")} className="mr-4 rounded-input" aria-label={t.homeAria}>
          <Logo />
        </Link>
        <DesktopNav sampleStoreUrl={withLang(`${env.storeUrl}/a/${DEMO_CODES.personal}`, locale)} />
        <div className="ml-auto flex items-center gap-2">
          {/* Parents get first-class entry points: find photos by code, or a shop account. */}
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link href={localePath(locale, "/find-my-photos")}>
              <Images aria-hidden /> {t.nav.findPhotos}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <a href={signInUrl}>{t.nav.signIn}</a>
          </Button>
          <Button asChild variant="primary" size="sm">
            <a href={signUpUrl}>{t.nav.signUp}</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
