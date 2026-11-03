"use client";

import { Button } from "@snapbell/ui/button";
import { Input } from "@snapbell/ui/input";
import { useMessages } from "@snapbell/ui/locale";
import { toE164 } from "@snapbell/ui/phone-input";
import { BellRing, CircleCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { notifyWhenReady } from "@shop/actions";
import { accessMsgs } from "@shop/messages/access";

/** "Notify me" for albums that aren't published yet. Accepts a phone number or an email. */
export function NotifyMeForm({ code }: { code: string }) {
  const t = useMessages(accessMsgs).notify;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p role="status" className="flex items-center justify-center gap-2 text-sm font-medium text-success">
        <CircleCheck className="size-5" aria-hidden /> {t.done}
      </p>
    );
  }

  return (
    <form
      className="grid gap-3 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        const destination = value.includes("@") ? value.trim() : toE164(value);
        if (!destination) {
          setError(t.invalid);
          return;
        }
        setError(null);
        start(async () => {
          const res = await notifyWhenReady(code, destination);
          if (res.ok) setDone(true);
          else setError(res.message);
        });
      }}
    >
      <label htmlFor="notify-dest" className="text-sm font-medium">
        {t.label}
      </label>
      <div className="flex gap-2">
        <Input
          id="notify-dest"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.placeholder}
          autoComplete="email"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "notify-error" : undefined}
        />
        <Button type="submit" loading={pending}>
          <BellRing aria-hidden />
          {t.submit}
        </Button>
      </div>
      {error && (
        <p id="notify-error" role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
