"use client";

import { Button } from "@snapbell/ui/button";
import { Alert } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { LanguageSwitcher, useLocale } from "@snapbell/ui/locale";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions";
import { adminMsgs } from "@/messages/admin";

export default function AdminLogin() {
  const locale = useLocale();
  const t = adminMsgs[locale];
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, { error: null });
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-ink px-4">
      <form action={formAction} className="grid w-full max-w-sm gap-5 rounded-card bg-surface p-6 shadow-overlay">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{t.appName}</h1>
            <p className="text-sm text-muted">{t.login.subtitle}</p>
          </div>
          <LanguageSwitcher variant="pills" />
        </div>
        {state.error && <Alert tone="danger" title={state.error} />}
        <Field label={t.login.email} htmlFor="email" locale={locale}>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </Field>
        <Field label={t.login.password} htmlFor="password" locale={locale}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" block loading={pending}>
          {t.login.submit}
        </Button>
        <p className="text-xs text-muted">{t.login.dev}</p>
      </form>
    </main>
  );
}
