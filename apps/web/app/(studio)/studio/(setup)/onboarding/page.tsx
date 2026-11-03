import { LanguageSwitcher } from "@snapbell/ui/locale";
import type { Metadata } from "next";
import Link from "next/link";
import { getSession, load } from "@studio/lib/api";
import { getLocale } from "@studio/lib/i18n";
import { onboardingMsgs } from "@studio/messages/onboarding";
import { OnboardingWizard } from "./wizard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: onboardingMsgs[await getLocale()].metaTitle };
}

export default async function OnboardingPage() {
  const { studio } = await getSession();
  const t = onboardingMsgs[await getLocale()];
  const [labs, sheets] = await Promise.all([load((c) => c.labs.list()), load((c) => c.priceSheets.list())]);
  return (
    <div className="min-h-dvh">
      <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 md:px-8">
        <span className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-input bg-accent text-sm font-bold text-accent-ink" aria-hidden>
            S
          </span>
          Snapbell Studio
        </span>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/studio/home" className="text-sm text-muted hover:text-ink">
            {t.finishLater}
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto grid max-w-3xl gap-8 px-4 py-8 md:py-12">
        <OnboardingWizard studio={studio} labs={labs} priceSheets={sheets} />
      </main>
    </div>
  );
}
