import { LanguageSwitcher } from "@snapbell/ui/locale";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VerifyForm } from "@/components/verify-form";
import { hasSession, load, safeNext } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { authMsgs } from "@/messages/auth";

/** Public /signin and /signup: one-time code, no password. Signed-in parents go straight on. */
export async function AuthPage({ mode, next: rawNext }: { mode: "signin" | "signup"; next: unknown }) {
  const next = safeNext(rawNext) ?? undefined;
  if (await hasSession()) {
    const me = await load((c) => c.auth.me());
    if (me.ok && me.data.kind === "parent") redirect(next ?? "/account");
  }

  const a = authMsgs[await getLocale()];
  const keepNext = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-8 px-4 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-12">
      <div className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-4">
        <LanguageSwitcher variant="pills" />
      </div>
      <VerifyForm albumCode="" next={next} studio={null} mode={mode} />
      <p className="text-center text-sm text-muted">
        {mode === "signin" ? a.newHere : a.haveAccount}{" "}
        <Link
          href={`${mode === "signin" ? "/signup" : "/signin"}${keepNext}`}
          className="tap inline-flex items-center font-medium text-ink underline underline-offset-4 hover:no-underline"
        >
          {mode === "signin" ? a.createAccount : a.signIn}
        </Link>
      </p>
    </main>
  );
}
