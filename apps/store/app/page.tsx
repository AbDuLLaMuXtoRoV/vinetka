import { normalizeCode } from "@snapbell/sdk";
import type { Metadata } from "next";
import { LanguageSwitcher } from "@snapbell/ui/locale";
import { CodeEntry } from "@/components/code-entry";
import { DemoNotice } from "@/components/demo-notice";
import { getLocale } from "@/lib/i18n";
import { metaMsgs } from "@/messages/meta";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].enterCode };
}

export default async function EnterCodePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initial = typeof sp.code === "string" ? normalizeCode(sp.code).slice(0, 6) : "";
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center px-4 pt-[env(safe-area-inset-top)] pb-12">
      <div className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-4">
        <LanguageSwitcher variant="pills" />
      </div>
      <CodeEntry initialCode={initial} />
      <DemoNotice locale={await getLocale()} />
    </main>
  );
}
