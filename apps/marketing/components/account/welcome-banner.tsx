"use client";

import { useLocale } from "@snapbell/ui/locale";
import { CircleCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { WELCOME_COOKIE, readParentName } from "@/lib/parent-links";
import { accountMsgs } from "@/messages/account";

/** "Welcome, {name}" once, right after signing in on the main site. */
export function WelcomeBanner() {
  const locale = useLocale();
  const t = accountMsgs[locale].welcome;
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!document.cookie.split("; ").some((c) => c === `${WELCOME_COOKIE}=1`)) return;
    document.cookie = `${WELCOME_COOKIE}=; Max-Age=0; path=/`;
    const who = readParentName();
    if (!who) return;
    setName(who);
    const timer = setTimeout(() => setName(null), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!name) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div role="status" className="pointer-events-auto flex w-full max-w-md animate-pop-in items-start gap-3 rounded-card bg-ink p-4 text-bg shadow-overlay">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        <div className="grid flex-1 gap-0.5 text-sm">
          <p className="font-medium">{t.title(name)}</p>
          <p className="opacity-80">{t.body}</p>
        </div>
        <button type="button" onClick={() => setName(null)} className="-m-1 grid size-9 place-items-center rounded opacity-70 hover:opacity-100" aria-label={t.dismiss}>
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
