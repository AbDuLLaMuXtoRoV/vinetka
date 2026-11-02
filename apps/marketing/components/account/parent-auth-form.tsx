"use client";

import type { MessageChannel } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Checkbox } from "@snapbell/ui/checkbox";
import { CodeInput } from "@snapbell/ui/code-input";
import { Alert } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { cn } from "@snapbell/ui/lib/cn";
import { useLocale } from "@snapbell/ui/locale";
import { PhoneInput, formatPhoneDisplay, toE164 } from "@snapbell/ui/phone-input";
import { Mail, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { sendParentCode, verifyParentCode } from "@/app/account-actions";
import { localePath } from "@/lib/i18n";
import { storeLink } from "@/lib/parent-links";
import { accountMsgs } from "@/messages/account";
import { useParentName } from "./account-slot";

/**
 * Parent sign-in / sign-up on the main site: phone (+998) or email, then a
 * 6-digit one-time code. No passwords. Afterwards the parent stays on the main
 * site; the shop is one click away in the account menu.
 */
export function ParentAuthForm({ mode }: { mode: "signin" | "signup" }) {
  const locale = useLocale();
  const t = accountMsgs[locale];
  const { mounted, name: signedInAs } = useParentName();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<MessageChannel>("sms");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [smsUpdates, setSmsUpdates] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [step, setStep] = useState<"details" | "code">("details");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  if (!mounted) return null;

  if (signedInAs) {
    return (
      <div className="grid gap-4">
        <h1 className="font-display text-2xl text-balance">{t.signedIn.title(signedInAs)}</h1>
        <p className="text-muted">{t.signedIn.body}</p>
        <Button asChild size="lg" block>
          <a href={storeLink(locale, "/account")}>{t.signedIn.goToAccount}</a>
        </Button>
      </div>
    );
  }

  const send = (dest: string) => {
    setError(null);
    start(async () => {
      const res = await sendParentCode({ locale, channel, destination: dest });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setDestination(res.destination);
      setDevCode(res.devCode);
      setResendIn(res.resendAfterSec);
      setCode("");
      setStep("code");
    });
  };

  const submitDetails = () => {
    if (mode === "signup" && !name.trim()) {
      setError(t.errors.badName);
      return;
    }
    const dest = channel === "sms" ? toE164(phone) : email.trim();
    if (channel === "sms" && !dest) {
      setError(t.errors.badPhone);
      return;
    }
    if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError(t.errors.badEmail);
      return;
    }
    send(dest!);
  };

  const verify = (value: string) => {
    setError(null);
    start(async () => {
      const next = new URLSearchParams(window.location.search).get("next") ?? undefined;
      const res = await verifyParentCode({
        locale,
        destination,
        code: value,
        name: mode === "signup" ? name.trim() : undefined,
        consent: mode === "signup" ? { smsUpdates, marketing } : undefined,
        next,
      });
      if (!res.ok) {
        setError(res.message);
        setCode("");
        return;
      }
      // A full load so the header and the welcome note read the new session.
      window.location.assign(res.redirectTo);
    });
  };

  const heading = mode === "signin" ? t.signin : t.signup;

  if (step === "code") {
    const shown = channel === "sms" ? formatPhoneDisplay(destination) : destination;
    return (
      <div className="grid gap-6">
        <div className="grid gap-2">
          <h1 className="font-display text-2xl">{t.form.codeTitle}</h1>
          <p className="text-muted">{t.form.codeSentTo(shown)}</p>
        </div>
        {devCode && (
          <p className="rounded-input bg-accent/15 p-3 text-sm">
            {t.form.devCode} <code className="font-mono font-semibold">{devCode}</code>
          </p>
        )}
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) verify(code);
            else setError(t.errors.badCode);
          }}
        >
          <CodeInput value={code} onChange={setCode} onComplete={verify} mode="numeric" label={t.form.codeLabel} invalid={!!error} disabled={pending} autoFocus />
          {error && <Alert tone="danger" title={error} />}
          <Button type="submit" size="lg" block loading={pending} disabled={code.length < 6}>
            {t.form.verify}
          </Button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          {resendIn > 0 ? (
            <span className="text-muted" aria-live="polite">
              {t.form.resendIn(resendIn)}
            </span>
          ) : (
            <button type="button" onClick={() => send(destination)} disabled={pending} className="min-h-11 font-medium underline underline-offset-4 hover:no-underline">
              {t.form.resend}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setError(null);
            }}
            className="min-h-11 text-muted underline underline-offset-4 hover:text-ink"
          >
            {t.form.change}
          </button>
        </div>
      </div>
    );
  }

  const tab = (value: MessageChannel, label: string, Icon: typeof Mail) => (
    <button
      type="button"
      role="radio"
      aria-checked={channel === value}
      onClick={() => {
        setChannel(value);
        setError(null);
      }}
      className={cn(
        "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[6px] text-sm font-medium transition-colors duration-150",
        channel === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
      )}
    >
      <Icon className="size-4" aria-hidden /> {label}
    </button>
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="font-display text-2xl">{heading.heading}</h1>
        <p className="text-muted">{heading.lead}</p>
      </div>
      <form
        className="grid gap-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submitDetails();
        }}
      >
        {mode === "signup" && (
          <Field label={t.form.name} htmlFor="pa-name" locale={locale}>
            <Input id="pa-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} required />
          </Field>
        )}
        <div role="radiogroup" aria-label={t.form.channelAria} className="flex gap-1 rounded-input bg-sunken p-1">
          {tab("sms", t.form.byPhone, Smartphone)}
          {tab("email", t.form.byEmail, Mail)}
        </div>
        {channel === "sms" ? (
          <Field label={t.form.phone} htmlFor="pa-phone" locale={locale}>
            <PhoneInput id="pa-phone" value={phone} onValueChange={setPhone} />
          </Field>
        ) : (
          <Field label={t.form.email} htmlFor="pa-email" locale={locale}>
            <Input id="pa-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        )}
        {mode === "signup" && (
          <div className="grid gap-3">
            <Checkbox id="pa-sms" checked={smsUpdates} onCheckedChange={(v) => setSmsUpdates(v === true)} label={t.form.smsUpdates} description={t.form.smsUpdatesHint} />
            <Checkbox id="pa-marketing" checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} label={t.form.marketing} description={t.form.marketingHint} />
          </div>
        )}
        {error && <Alert tone="danger" title={error} />}
        <Button type="submit" size="lg" block loading={pending}>
          {t.form.sendCode}
        </Button>
      </form>
      <p className="text-sm text-muted">
        {mode === "signin" ? t.switchTo.noAccount : t.switchTo.haveAccount}{" "}
        <Link href={localePath(locale, mode === "signin" ? "/signup" : "/signin")} className="font-medium text-ink underline underline-offset-4 hover:no-underline">
          {mode === "signin" ? t.switchTo.createAccount : t.switchTo.signIn}
        </Link>
      </p>
      <p className="text-xs text-muted">{t.privacyNote}</p>
    </div>
  );
}
