"use client";

import { Button } from "@snapbell/ui/button";
import { Input } from "@snapbell/ui/input";
import { useLocale } from "@snapbell/ui/locale";
import { CircleCheck } from "lucide-react";
import { useActionState } from "react";
import { subscribeNewsletter, type FormState } from "@/app/actions";
import { commonMsgs } from "@/messages/common";

export function NewsletterForm() {
  const locale = useLocale();
  const t = commonMsgs[locale].newsletter;
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeNewsletter, { status: "idle" });

  if (state.status === "success") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm">
        <CircleCheck className="size-5 text-success" aria-hidden />
        {state.message}
      </p>
    );
  }

  const error = state.errors?.email;
  return (
    <form action={action} className="grid gap-2" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor="newsletter-email" className="text-sm font-medium">
        {t.label}
      </label>
      <div className="flex gap-2">
        <Input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@studio.com"
          required
          aria-invalid={!!error || undefined}
          aria-describedby={error ? "newsletter-error" : undefined}
          className="min-w-0"
        />
        <Button type="submit" variant="secondary" loading={pending}>
          {t.subscribe}
        </Button>
      </div>
      {error && (
        <p id="newsletter-error" role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
