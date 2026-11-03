import { normalizeCode, type StudioBranding } from "@snapbell/sdk";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@snapbell/ui/locale";
import { VerifyForm } from "@shop/components/verify-form";
import { getBranding, hasSession, load, safeNext } from "@shop/lib/api";
import { getLocale } from "@shop/lib/i18n";
import { metaMsgs } from "@shop/messages/meta";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].verify };
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const code = typeof sp.code === "string" ? normalizeCode(sp.code) : "";
  const next = safeNext(sp.next) ?? undefined;
  const destination = next ?? (code ? `/shop/a/${code}` : "/shop/account");

  // Already verified on this device: skip straight to the album.
  if (await hasSession()) {
    const me = await load((c) => c.auth.me());
    if (me.ok && me.data.kind === "parent") redirect(destination);
  }

  let studio: StudioBranding | null = null;
  if (code) {
    const b = await getBranding(code);
    if (b.ok) studio = b.data;
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center px-4 pt-[env(safe-area-inset-top)] pb-12">
      <div className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-4">
        <LanguageSwitcher variant="pills" />
      </div>
      <VerifyForm albumCode={code} next={next} studio={studio} />
    </main>
  );
}
