"use client";

import type { MessageChannel, StudioBranding } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Checkbox } from "@snapbell/ui/checkbox";
import { CodeInput } from "@snapbell/ui/code-input";
import { Alert } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { brandStyle } from "@snapbell/ui/lib/brand";
import { cn } from "@snapbell/ui/lib/cn";
import { initials } from "@snapbell/ui/lib/format";
import { useLocale, useMessages } from "@snapbell/ui/locale";
import { PhoneInput, formatPhoneDisplay, toE164 } from "@snapbell/ui/phone-input";
import { Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { sendCode, verifyCode } from "@/app/actions";
import { verifyMsgs } from "@/messages/verify";

/** Screen 2: phone or email, then a 6-digit one-time code. No passwords anywhere. */
export function VerifyForm({ albumCode, next, studio }: { albumCode: string; next?: string; studio: StudioBranding | null }) {
  const locale = useLocale();
  const t = useMessages(verifyMsgs);
  const [channel, setChannel] = useState<MessageChannel>("sms");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [smsUpdates, setSmsUpdates] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [step, setStep] = useState<"destination" | "code">("destination");
  const [destination, setDestination] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const send = (dest: string) => {
    setError(null);
    start(async () => {
      const res = await sendCode(dest, channel, albumCode || undefined);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setDestination(res.data.destination || dest);
      setDevCode(res.data.devCode);
      setResendIn(res.data.resendAfterSec || 30);
      setOtp("");
      setStep("code");
    });
  };

  const submitDestination = () => {
    const dest = channel === "sms" ? toE164(phone) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? email.trim() : null;
    if (!dest) {
      setError(channel === "sms" ? t.badPhone : t.badEmail);
      return;
    }
    send(dest);
  };

  const verify = (code: string) => {
    setError(null);
    start(async () => {
      const res = await verifyCode({ destination, code, consent: { smsUpdates, marketing }, albumCode: albumCode || undefined, next });
      // verifyCode redirects on success; only failures come back.
      if (res && !res.ok) {
        setError(res.message || t.noMatch);
        setOtp("");
      }
    });
  };

  const shown = channel === "sms" ? formatPhoneDisplay(destination) : destination;

  return (
    <div className="grid gap-8" style={brandStyle(studio?.brandColor)}>
      <div className="grid justify-items-center gap-4 text-center">
        {studio?.logoUrl ? (
          <img src={studio.logoUrl} alt={studio.name} className="h-12 w-auto max-w-44 object-contain" />
        ) : (
          <span className="grid size-12 place-items-center rounded-full bg-accent text-sm font-bold text-accent-ink" aria-hidden>
            {studio ? initials(studio.name) : <ShieldCheck className="size-6" />}
          </span>
        )}
        <div className="grid gap-2">
          <h1 className="text-xl font-semibold text-balance">{step === "destination" ? t.titleDestination : t.titleCode}</h1>
          <p className="text-muted">
            {step === "destination" ? (
              t.introDestination(studio?.name ?? null)
            ) : (
              <>
                {t.sentTo(shown)[0]}
                <strong className="text-ink">{shown}</strong>
                {t.sentTo(shown)[2]}
              </>
            )}
          </p>
        </div>
      </div>

      {step === "destination" ? (
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            submitDestination();
          }}
        >
          <div role="radiogroup" aria-label={t.channelLabel} className="grid grid-cols-2 gap-1 rounded-input bg-sunken p-1">
            {(["sms", "email"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={channel === c}
                onClick={() => {
                  setChannel(c);
                  setError(null);
                }}
                className={cn(
                  "inline-flex h-11 items-center justify-center gap-2 rounded-[6px] text-sm font-medium transition-colors duration-150",
                  channel === c ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                {c === "sms" ? <Smartphone className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
                {c === "sms" ? t.textMe : t.emailMe}
              </button>
            ))}
          </div>

          {channel === "sms" ? (
            <Field label={t.mobile} htmlFor="verify-phone" locale={locale}>
              <PhoneInput id="verify-phone" value={phone} onValueChange={setPhone} autoFocus aria-invalid={error ? true : undefined} />
            </Field>
          ) : (
            <Field label={t.email} htmlFor="verify-email" locale={locale}>
              <Input
                id="verify-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                aria-invalid={error ? true : undefined}
              />
            </Field>
          )}

          <div className="grid gap-3">
            <Checkbox
              id="consent-sms"
              checked={smsUpdates}
              onCheckedChange={(v) => setSmsUpdates(v === true)}
              label={t.smsConsent}
              description={t.smsConsentNote}
            />
            <Checkbox
              id="consent-marketing"
              checked={marketing}
              onCheckedChange={(v) => setMarketing(v === true)}
              label={t.marketingConsent(studio?.name ?? null)}
              description={t.marketingConsentNote}
            />
          </div>

          {error && <Alert tone="danger">{error}</Alert>}

          <Button type="submit" size="lg" block loading={pending}>
            {t.sendCode}
          </Button>
        </form>
      ) : (
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (otp.length === 6) verify(otp);
          }}
        >
          <CodeInput label={t.codeLabel} mode="numeric" value={otp} onChange={setOtp} onComplete={verify} invalid={!!error} autoFocus disabled={pending} />
          {devCode && (
            <p className="rounded-input bg-sunken px-3 py-2 text-center text-xs text-muted">
              {t.devCode}
              <code className="font-mono font-semibold text-ink">{devCode}</code>
            </p>
          )}
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" size="lg" block loading={pending} disabled={otp.length !== 6}>
            {t.verifySubmit}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              className="tap px-1 text-muted underline underline-offset-4 hover:text-ink"
              onClick={() => {
                setStep("destination");
                setError(null);
              }}
            >
              {channel === "sms" ? t.differentNumber : t.differentEmail}
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || pending}
              onClick={() => send(destination)}
              className="tap px-1 font-medium underline underline-offset-4 disabled:text-muted disabled:no-underline"
              aria-live="polite"
            >
              {resendIn > 0 ? t.resendIn(resendIn) : t.resend}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
