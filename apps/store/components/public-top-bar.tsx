import { LanguageSwitcher } from "@snapbell/ui/locale";
import { LogIn, UserRound } from "lucide-react";
import Link from "next/link";
import { hasSession } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { authMsgs } from "@/messages/auth";

/** Top-right of public store pages: "Sign in" when signed out, "My account" when signed in, plus the language switcher. */
export async function PublicTopBar() {
  const a = authMsgs[await getLocale()];
  const signedIn = await hasSession();
  return (
    <div className="flex items-center gap-2">
      <Link
        href={signedIn ? "/account" : "/signin"}
        className="inline-flex h-9 items-center gap-1.5 rounded-input px-2 text-sm font-medium text-ink hover:bg-ink/5"
      >
        {signedIn ? <UserRound className="size-4" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
        {signedIn ? a.myAccount : a.signIn}
      </Link>
      <LanguageSwitcher variant="pills" />
    </div>
  );
}
