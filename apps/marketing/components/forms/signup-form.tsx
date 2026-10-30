"use client";

import { Button } from "@snapbell/ui/button";
import { Alert } from "@snapbell/ui/feedback";
import { useLocale } from "@snapbell/ui/locale";
import { useActionState, useEffect, useRef } from "react";
import { signUp, type FormState } from "@/app/actions";
import { track } from "@/lib/analytics";
import { localePath } from "@/lib/i18n";
import { formMsgs } from "@/messages/forms";
import { FormMessage, LocaleField, TextField } from "./form-bits";

const idle: FormState = { status: "idle" };

/**
 * Studio signup. The server action creates the studio through the API and
 * returns a one-time handoff URL; we record `signup_completed` and then go
 * to the studio app, which exchanges the code for a session.
 */
export function SignupForm({ googleUrl, loginUrl }: { googleUrl: string; loginUrl: string }) {
  const locale = useLocale();
  const t = formMsgs[locale];
  const [state, action, pending] = useActionState(signUp, idle);
  const started = useRef(false);

  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      track("signup_completed", { method: "email", locale });
      window.location.assign(state.redirectTo);
    }
  }, [state, locale]);

  const onStart = () => {
    if (started.current) return;
    started.current = true;
    track("signup_started", { method: "email", locale });
  };

  if (state.status === "success" && state.redirectTo) {
    return (
      <Alert tone="success" title={state.message}>
        <a href={state.redirectTo} className="font-medium text-ink underline underline-offset-4">
          {t.signup.continueSetup}
        </a>
      </Alert>
    );
  }

  return (
    <div className="grid gap-6">
      <Button asChild variant="outline" size="lg" block>
        <a href={googleUrl} onClick={() => track("signup_started", { method: "google", locale })}>
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.3Z" />
            <path fill="currentColor" opacity=".75" d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z" />
            <path fill="currentColor" opacity=".5" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9Z" />
            <path fill="currentColor" opacity=".9" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3 7.5l3.4 2.6C7.2 7.8 9.4 6 12 6Z" />
          </svg>
          {t.signup.google}
        </a>
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" /> {t.signup.orEmail} <span className="h-px flex-1 bg-border" />
      </div>
      <form action={action} onFocus={onStart} className="grid gap-4" noValidate>
        <LocaleField />
        <FormMessage state={state} />
        <TextField name="name" label={t.fields.yourName} autoComplete="name" state={state} />
        <TextField name="studioName" label={t.fields.studioName} autoComplete="organization" state={state} />
        <TextField name="email" label={t.fields.workEmail} type="email" autoComplete="email" state={state} />
        <TextField name="password" label={t.fields.password} type="password" autoComplete="new-password" minLength={8} hint={t.fields.passwordHint} state={state} />
        <Button type="submit" size="lg" block loading={pending}>
          {t.signup.submit}
        </Button>
        <p className="text-xs text-muted">
          {t.signup.agree[0]}
          <a href={localePath(locale, "/terms")} className="underline underline-offset-2">
            {t.signup.agree[1]}
          </a>
          {t.signup.agree[2]}
          <a href={localePath(locale, "/privacy")} className="underline underline-offset-2">
            {t.signup.agree[3]}
          </a>
          {t.signup.agree[4]}
        </p>
      </form>
      <p className="text-sm text-muted">
        {t.signup.haveAccount}{" "}
        <a href={loginUrl} className="font-medium text-ink underline underline-offset-4">
          {t.signup.login}
        </a>
      </p>
    </div>
  );
}
