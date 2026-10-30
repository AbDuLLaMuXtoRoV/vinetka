"use client";

import { LOCALE_LABELS, LOCALES, type Locale } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { useMessages } from "@snapbell/ui/locale";
import { Select } from "@snapbell/ui/select";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { printMsgs } from "@/messages/roster";

export function PrintControls({ jobId, view, printLocale }: { jobId: string; view: string; printLocale: Locale }) {
  const t = useMessages(printMsgs);
  const router = useRouter();
  const query = (next: { view?: string; plang?: string }) => `?${new URLSearchParams({ view: next.view ?? view, plang: next.plang ?? printLocale })}`;
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button variant="ghost" asChild>
        <Link href={`/jobs/${jobId}/roster`}>
          <ArrowLeft /> {t.roster}
        </Link>
      </Button>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted">
          {t.printLanguage}
          <Select value={printLocale} onChange={(e) => router.push(query({ plang: e.target.value }))} className="w-auto">
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l].native}
              </option>
            ))}
          </Select>
        </label>
        <Button variant={view === "cards" ? "secondary" : "outline"} asChild>
          <Link href={query({ view: "cards" })}>{t.cards}</Link>
        </Button>
        <Button variant={view === "flyer" ? "secondary" : "outline"} asChild>
          <Link href={query({ view: "flyer" })}>{t.flyer}</Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer /> {t.print}
        </Button>
      </div>
    </div>
  );
}
