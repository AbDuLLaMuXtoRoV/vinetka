"use client";

import { passCredit, type PassOffer, type StudioBranding } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Alert } from "@snapbell/ui/feedback";
import { Field, describedBy } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useFormatters, useLocale, useMessages } from "@snapbell/ui/locale";
import { PhoneInput, toE164 } from "@snapbell/ui/phone-input";
import { RadioGroup } from "@snapbell/ui/radio-group";
import { CalendarDays, CircleCheck, FlaskConical, MessageSquareText, Ticket } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { buyPass } from "@shop/actions";
import { track } from "@shop/lib/analytics";
import { dayWithWeekday } from "@shop/lib/dates";
import { stripePublishableKey } from "@shop/lib/stripe";
import { passMsgs } from "@shop/messages/pass";

const PassStripeConfirm = dynamic(() => import("./pass-stripe-confirm").then((m) => m.PassStripeConfirm), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-input bg-sunken" aria-hidden />,
});

type Offer = PassOffer & { studio: StudioBranding; organizationName: string; pictureDay: string };

export function PassForm({ offer }: { offer: Offer }) {
  const locale = useLocale();
  const t = useMessages(passMsgs);
  const fmt = useFormatters();
  const [amount, setAmount] = useState(offer.amountsCents[Math.min(1, offer.amountsCents.length - 1)] ?? offer.amountsCents[0] ?? 0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"name" | "email" | "phone", string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [done, setDone] = useState<{ credit: number } | null>(null);
  const [pending, start] = useTransition();

  const ended = !offer.active || new Date(offer.endsAt) < new Date();
  const credit = passCredit(amount, offer.bonusBps);

  if (done) {
    return (
      <div className="grid justify-items-center gap-4 text-center">
        <CircleCheck className="size-14 text-success" aria-hidden />
        <h1 className="text-xl font-semibold">{t.doneTitle}</h1>
        <p className="text-muted">
          {t.doneCredit(fmt.money(done.credit), offer.organizationName, offer.jobName)[0]}
          <strong className="text-ink">{fmt.money(done.credit)}</strong>
          {t.doneCredit(fmt.money(done.credit), offer.organizationName, offer.jobName)[2]}
        </p>
        <p className="flex items-center gap-2 rounded-card border border-border bg-surface p-4 text-left text-sm">
          <MessageSquareText className="size-5 shrink-0 text-muted" aria-hidden />
          {t.doneNote}
        </p>
      </div>
    );
  }

  const submit = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = t.errors.name;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = t.errors.email;
    if (!toE164(phone)) e.phone = t.errors.phone;
    setErrors(e);
    if (Object.keys(e).length) return;
    setError(null);
    start(async () => {
      const res = await buyPass(offer.id, amount, { name: name.trim(), email: email.trim(), phone: toE164(phone) });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      if (res.data.clientSecret && stripePublishableKey) {
        setClientSecret(res.data.clientSecret);
        return;
      }
      track("pass_purchased", { amountCents: amount });
      setDone({ credit: res.data.pass.creditCents });
    });
  };

  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        <Badge tone="accent" className="w-fit">
          <Ticket aria-hidden /> Picture Day Pass
        </Badge>
        <h1 className="text-xl font-semibold text-balance md:text-2xl">
          {t.title(offer.organizationName, offer.bonusBps > 0 ? fmt.percent(offer.bonusBps / 10_000) : null)}
        </h1>
        <p className="flex items-center gap-2 text-sm text-muted">
          <CalendarDays className="size-4" aria-hidden />
          {t.pictureDay(offer.jobName, dayWithWeekday(fmt, offer.pictureDay))}
        </p>
        <p className="text-muted">{t.intro}</p>
      </header>

      {ended ? (
        <Alert tone="warning" title={t.endedTitle}>
          {t.endedBody}
        </Alert>
      ) : clientSecret ? (
        <PassStripeConfirm
          clientSecret={clientSecret}
          amountCents={amount}
          onSuccess={() => {
            track("pass_purchased", { amountCents: amount });
            setDone({ credit });
          }}
        />
      ) : (
        <form
          className="grid gap-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <fieldset className="grid gap-3">
            <legend className="mb-3 text-base font-semibold">{t.chooseCredit}</legend>
            <RadioGroup
              name="amount"
              variant="cards"
              aria-label={t.creditAmount}
              value={String(amount)}
              onValueChange={(v) => setAmount(Number(v))}
              className="md:grid-flow-row md:grid-cols-3"
              options={offer.amountsCents.map((a) => ({
                value: String(a),
                label: <span className="text-lg tabular-nums">{fmt.money(a, { whole: a % 100 === 0 })}</span>,
                description: offer.bonusBps > 0 ? <span className="font-medium text-success">{t.getCredit(fmt.money(passCredit(a, offer.bonusBps)))}</span> : t.anyPhotos,
              }))}
            />
          </fieldset>

          <fieldset className="grid gap-4">
            <legend className="mb-3 text-base font-semibold">{t.details}</legend>
            <Field label={t.fullName} htmlFor="pass-name" error={errors.name} locale={locale}>
              <Input id="pass-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={errors.name ? true : undefined} aria-describedby={describedBy("pass-name", { error: errors.name })} />
            </Field>
            <Field label={t.email} htmlFor="pass-email" error={errors.email} locale={locale}>
              <Input id="pass-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={errors.email ? true : undefined} aria-describedby={describedBy("pass-email", { error: errors.email })} />
            </Field>
            <Field label={t.mobile} htmlFor="pass-phone" error={errors.phone} hint={t.mobileHint} locale={locale}>
              <PhoneInput id="pass-phone" value={phone} onValueChange={setPhone} aria-invalid={errors.phone ? true : undefined} aria-describedby={describedBy("pass-phone", { error: errors.phone, hint: true })} />
            </Field>
          </fieldset>

          {error && <Alert tone="danger">{error}</Alert>}
          {!stripePublishableKey && (
            <p className="flex items-center gap-2 text-xs text-muted">
              <FlaskConical className="size-4" aria-hidden /> {t.testMode}
            </p>
          )}
          <Button type="submit" size="lg" block loading={pending}>
            {t.pay(fmt.money(amount), fmt.money(credit))}
          </Button>
        </form>
      )}
    </div>
  );
}
