"use client";

import { Button } from "@snapbell/ui/button";
import { Alert } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useLocale } from "@snapbell/ui/locale";
import { Mail, ShieldCheck } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { loginAction, magicLinkAction, type LoginState } from "@studio/lib/actions";
import { env } from "@studio/lib/env";
import { authMsgs } from "@studio/messages/auth";

/** The dev link may point at any host; route its token through this app's /auth/magic. */
function localMagicLink(devLink: string): string {
  try {
    const token = new URL(devLink, "http://localhost").searchParams.get("token");
    return token ? `/studio/auth/magic?token=${encodeURIComponent(token)}` : devLink;
  } catch {
    return devLink;
  }
}

export function LoginForm({ next, expired, googleConfigured }: { next: string; expired: boolean; googleConfigured: boolean }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, { error: null, email: "" });
  const [email, setEmail] = useState(state.email);
  const [magic, setMagic] = useState<{ sent: boolean; devLink: string | null; error?: string } | null>(null);
  const [sending, startSending] = useTransition();
  const locale = useLocale();
  const t = authMsgs[locale];

  const sendMagicLink = () =>
    startSending(async () => {
      if (!email.includes("@")) {
        setMagic({ sent: false, devLink: null, error: t.magicNeedsEmail });
        return;
      }
      const res = await magicLinkAction(email);
      setMagic(res.ok ? { sent: true, devLink: res.devLink } : { sent: false, devLink: null, error: res.error });
    });

  return (
    <div className="grid gap-6 rounded-card border border-border bg-surface p-6">
      {expired && !state.error && <Alert tone="warning" title={t.sessionEnded}>{t.sessionEndedBody}</Alert>}
      {state.error && <Alert tone="danger" title={state.error} />}

      <Button
        variant="outline"
        block
        disabled={!googleConfigured}
        title={googleConfigured ? undefined : t.googleHint}
        onClick={() => {
          window.location.href = `${env.publicApiUrl}/auth/google`;
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden className="size-4">
          <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7H2.1a11 11 0 0 0 0 9.9l3.7-2.7z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z" />
        </svg>
        {t.google}
      </Button>
      {!googleConfigured && <p className="-mt-4 text-center text-xs text-muted">{t.googleOff}</p>}

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        {t.orEmail}
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="next" value={next} />
        <Field label={t.email} htmlFor="email" locale={locale}>
          <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t.password} htmlFor="password" locale={locale}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" block loading={pending}>
          {t.logIn}
        </Button>
      </form>

      <div className="grid gap-2">
        <Button variant="ghost" block onClick={sendMagicLink} loading={sending}>
          <Mail /> {t.magicLink}
        </Button>
        {magic?.error && <p className="text-center text-xs text-danger">{magic.error}</p>}
        {magic?.sent && (
          <Alert tone="success" title={t.checkInbox}>
            {t.sentTo(email)}
            {magic.devLink && (
              <>
                {" "}
                {t.devMode}{" "}
                <a className="font-medium text-ink underline" href={localMagicLink(magic.devLink)}>
                  {t.openLink}
                </a>
                .
              </>
            )}
          </Alert>
        )}
      </div>

      <p className="flex items-start gap-2 text-xs text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t.twoFactorNote}
      </p>
    </div>
  );
}
