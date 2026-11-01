"use client";

import { Button } from "@snapbell/ui/button";
import { Alert } from "@snapbell/ui/feedback";
import { Field, describedBy } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useLocale } from "@snapbell/ui/locale";
import { useActionState } from "react";
import { completeSetupAction, type SetupState } from "@/lib/actions";
import { setupMsgs } from "@/messages/setup";

export function SetupForm({ token, email }: { token: string; email: string }) {
  const locale = useLocale();
  const t = setupMsgs[locale];
  const [state, formAction, pending] = useActionState<SetupState, FormData>(completeSetupAction, { error: null, field: null });
  const passwordError = state.field === "password" ? state.error : null;
  const confirmError = state.field === "confirm" ? state.error : null;

  return (
    <form action={formAction} className="grid gap-4">
      {state.error && !state.field && <Alert tone="danger" title={state.error} />}
      <input type="hidden" name="token" value={token} />
      {/* Lets password managers save the new credentials under the right account. */}
      <Field label={t.email} htmlFor="setup-email" locale={locale}>
        <Input id="setup-email" name="username" type="email" autoComplete="username" value={email} readOnly className="bg-sunken" />
      </Field>
      <Field label={t.password} htmlFor="setup-password" hint={t.passwordHint} error={passwordError} locale={locale}>
        <Input
          id="setup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={describedBy("setup-password", { hint: t.passwordHint, error: passwordError })}
        />
      </Field>
      <Field label={t.confirm} htmlFor="setup-confirm" error={confirmError} locale={locale}>
        <Input
          id="setup-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={confirmError ? true : undefined}
          aria-describedby={describedBy("setup-confirm", { error: confirmError })}
        />
      </Field>
      <Button type="submit" block loading={pending}>
        {t.submit}
      </Button>
    </form>
  );
}
