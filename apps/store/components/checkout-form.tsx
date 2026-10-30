"use client";

import type { Address, Cart, Contact, DeliveryMethod, PaymentMethodKind, Shop } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { PriceBreakdown } from "@snapbell/ui/commerce/price-breakdown";
import { Alert } from "@snapbell/ui/feedback";
import { Field, describedBy } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useFormatters, useLocale, useMessages } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { PhoneInput, formatUsPhone, toE164 } from "@snapbell/ui/phone-input";
import { RadioGroup } from "@snapbell/ui/radio-group";
import type { Stripe } from "@stripe/stripe-js";
import { CreditCard, FlaskConical, Lock, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { confirmCheckout, submitCheckout, updateCart } from "@/app/actions";
import { stripePublishableKey } from "@/lib/stripe";
import { checkoutMsgs } from "@/messages/checkout";

// Stripe.js only loads when a publishable key is configured.
const StripePayment = dynamic(() => import("./stripe-payment").then((m) => m.StripePayment), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-input bg-sunken" aria-hidden />,
});

type Errors = Partial<Record<"name" | "email" | "phone" | "line1" | "city" | "state" | "postalCode", string>>;

export interface PayRequest {
  method: PaymentMethodKind;
  paymentMethodId: string | null;
  stripe?: Stripe | null;
}

/** Screen 9: one-page checkout. Errors never clear the cart or the form. */
export function CheckoutForm({ cart: initial, initialContact, shippingOptions }: { cart: Cart; initialContact: Contact; shippingOptions: Shop["shippingOptions"] }) {
  const locale = useLocale();
  const t = useMessages(checkoutMsgs);
  const fmt = useFormatters();
  const [cart, setCart] = useState(initial);
  const [name, setName] = useState(initialContact.name);
  const [email, setEmail] = useState(initialContact.email);
  const [phone, setPhone] = useState(initialContact.phone ? formatUsPhone(initialContact.phone) : "");
  const [method, setMethod] = useState<DeliveryMethod>(
    shippingOptions.some((o) => o.method === initial.deliveryMethod) ? initial.deliveryMethod : (shippingOptions[0]?.method ?? "home"),
  );
  const [address, setAddress] = useState<Address>({ line1: "", line2: null, city: "", state: "", postalCode: "", country: "US" });
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);

  const totals = cart.totals;
  const needsPayment = totals.chargedCents > 0;

  const changeDelivery = async (next: DeliveryMethod) => {
    setMethod(next);
    const res = await updateCart({ deliveryMethod: next });
    if (res.ok) setCart(res.data);
  };

  const refreshTax = async (postalCode: string) => {
    if (!/^\d{5}$/.test(postalCode)) return;
    const res = await updateCart({ postalCode });
    if (res.ok) setCart(res.data);
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!name.trim()) e.name = t.errors.name;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = t.errors.email;
    if (phone && !toE164(phone)) e.phone = t.errors.phone;
    if (method === "home") {
      if (!address.line1.trim()) e.line1 = t.errors.line1;
      if (!address.city.trim()) e.city = t.errors.city;
      if (!/^[A-Za-z]{2}$/.test(address.state.trim())) e.state = t.errors.state;
      if (!/^\d{5}(-\d{4})?$/.test(address.postalCode.trim())) e.postalCode = t.errors.postalCode;
    }
    setErrors(e);
    if (Object.keys(e).length) {
      setError(t.errors.checkFields);
      document.getElementById(`co-${Object.keys(e)[0]}`)?.focus();
      return false;
    }
    setError(null);
    return true;
  };

  /** Submits the order. Paid orders redirect from the server; only 3-D Secure and errors return here. */
  const pay = async ({ method: payMethod, paymentMethodId, stripe }: PayRequest) => {
    setBusy(true);
    setError(null);
    try {
      const res = await submitCheckout({
        contact: { name: name.trim(), email: email.trim(), phone: phone ? toE164(phone) : null },
        delivery: {
          method,
          address: method === "home" ? { ...address, state: address.state.trim().toUpperCase(), line2: address.line2?.trim() || null } : null,
        },
        payment: { method: payMethod, paymentMethodId },
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      if (res.data.status === "requires_action") {
        if (stripe && res.data.clientSecret) {
          const action = await stripe.handleNextAction({ clientSecret: res.data.clientSecret });
          if (action.error) {
            setError(action.error.message ?? t.errors.bankDeclined);
            return;
          }
          const confirmed = await confirmCheckout(res.data.orderId);
          if (!confirmed.ok) setError(confirmed.message);
        } else {
          setChallenge(res.data.orderId);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof Errors) => ({
    id: `co-${key}`,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": describedBy(`co-${key}`, { error: errors[key] }),
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <form className="grid gap-8" onSubmit={(e) => e.preventDefault()} noValidate>
        <h1 className="text-xl font-semibold md:text-2xl">{t.title}</h1>

        <section aria-labelledby="contact-h" className="grid gap-4">
          <h2 id="contact-h" className="text-base font-semibold">
            {t.contact}
          </h2>
          <Field label={t.fullName} htmlFor="co-name" error={errors.name} locale={locale}>
            <Input {...field("name")} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t.email} htmlFor="co-email" error={errors.email} hint={t.emailHint} locale={locale}>
              <Input {...field("email")} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label={t.mobile} htmlFor="co-phone" error={errors.phone} optional hint={t.mobileHint} locale={locale}>
              <PhoneInput {...field("phone")} value={phone} onValueChange={setPhone} />
            </Field>
          </div>
        </section>

        <section aria-labelledby="delivery-h" className="grid gap-4">
          <h2 id="delivery-h" className="text-base font-semibold">
            {t.delivery}
          </h2>
          {shippingOptions.length > 1 ? (
            <RadioGroup
              name="delivery"
              variant="cards"
              aria-label={t.deliveryMethod}
              value={method}
              onValueChange={(v) => void changeDelivery(v as DeliveryMethod)}
              options={shippingOptions.map((o) => ({
                value: o.method,
                label: (
                  <span className="flex items-center gap-2">
                    {t.methods[o.method]}
                    <span className="font-normal text-muted">{o.priceCents === 0 ? t.free : fmt.money(o.priceCents)}</span>
                  </span>
                ),
                description: t.methodNotes[o.method],
              }))}
            />
          ) : (
            <p className="text-sm text-muted">{t.methods[shippingOptions[0]?.method ?? "home"]}</p>
          )}

          {method === "home" && (
            <div className="grid gap-4">
              <Field label={t.street} htmlFor="co-line1" error={errors.line1} locale={locale}>
                <Input {...field("line1")} autoComplete="address-line1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
              </Field>
              <Field label={t.apartment} htmlFor="co-line2" optional locale={locale}>
                <Input id="co-line2" autoComplete="address-line2" value={address.line2 ?? ""} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
              </Field>
              <div className="grid grid-cols-[1fr_5rem_7rem] gap-3">
                <Field label={t.city} htmlFor="co-city" error={errors.city} locale={locale}>
                  <Input {...field("city")} autoComplete="address-level2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </Field>
                <Field label={t.state} htmlFor="co-state" error={errors.state} locale={locale}>
                  <Input
                    {...field("state")}
                    autoComplete="address-level1"
                    maxLength={2}
                    className="uppercase"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value.replace(/[^a-z]/gi, "") })}
                  />
                </Field>
                <Field label={t.zip} htmlFor="co-postalCode" error={errors.postalCode} locale={locale}>
                  <Input
                    {...field("postalCode")}
                    autoComplete="postal-code"
                    inputMode="numeric"
                    maxLength={10}
                    value={address.postalCode}
                    onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                    onBlur={(e) => void refreshTax(e.target.value.trim())}
                  />
                </Field>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="payment-h" className="grid gap-4">
          <h2 id="payment-h" className="flex items-center gap-2 text-base font-semibold">
            {t.payment} <Lock className="size-4 text-muted" aria-hidden />
          </h2>
          {error && <Alert tone="danger" title={t.couldntPlace}>{error}</Alert>}
          {!needsPayment ? (
            <>
              <p className="text-sm text-muted">{t.passCovers}</p>
              <Button size="lg" block loading={busy} onClick={() => validate() && void pay({ method: "card", paymentMethodId: null })}>
                {t.placeOrder}
              </Button>
            </>
          ) : stripePublishableKey ? (
            <StripePayment
              amountCents={totals.chargedCents}
              billing={{ name, email, phone: phone ? toE164(phone) : null }}
              busy={busy}
              validate={validate}
              onPay={pay}
              onError={setError}
            />
          ) : (
            <TestModePayment amountCents={totals.chargedCents} busy={busy} onPay={(m) => validate() && void pay({ method: m, paymentMethodId: null })} />
          )}
          <p className="flex items-center gap-2 text-xs text-muted">
            <ShieldCheck className="size-4" aria-hidden /> {t.stripeNote}
          </p>
        </section>
      </form>

      <aside aria-label={t.summary} className="grid gap-4 rounded-card border border-border bg-surface p-5 lg:sticky lg:top-20">
        <h2 className="text-base font-semibold">{t.summary}</h2>
        <ul className="grid gap-2 text-sm">
          {cart.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate">
                  {i.quantity > 1 && `${i.quantity} × `}
                  {i.name}
                </span>
                <span className="text-xs text-muted">{i.subjectName}</span>
              </span>
              <span className="tabular-nums">{fmt.money(i.unitPriceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <PriceBreakdown totals={totals} promoCode={cart.promoCode} locale={locale} />
      </aside>

      <Modal
        open={challenge !== null}
        onOpenChange={(o) => !o && !busy && setChallenge(null)}
        title={t.challengeTitle}
        description={t.challengeDescription}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setChallenge(null)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button
              loading={busy}
              onClick={async () => {
                if (!challenge) return;
                setBusy(true);
                const res = await confirmCheckout(challenge);
                setBusy(false);
                if (!res.ok) {
                  setChallenge(null);
                  setError(res.message);
                }
              }}
            >
              {t.approve}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t.challengeBody}</p>
      </Modal>
    </div>
  );
}

/** Shown when no Stripe key is configured: payments are simulated by the API. */
function TestModePayment({ amountCents, busy, onPay }: { amountCents: number; busy: boolean; onPay: (method: PaymentMethodKind) => void }) {
  const t = useMessages(checkoutMsgs);
  const amount = useFormatters().money(amountCents);
  return (
    <div className="grid gap-3 rounded-card border border-dashed border-warning bg-warning/8 p-4">
      <div className="flex items-center gap-2">
        <Badge tone="warning">
          <FlaskConical aria-hidden /> {t.testMode}
        </Badge>
        <p className="text-xs text-muted">{t.testNote}</p>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <Button variant="secondary" size="lg" loading={busy} onClick={() => onPay("apple_pay")} aria-label={t.payWith(amount, "Apple Pay")}>
          Apple Pay
        </Button>
        <Button variant="secondary" size="lg" loading={busy} onClick={() => onPay("google_pay")} aria-label={t.payWith(amount, "Google Pay")}>
          Google Pay
        </Button>
        <Button size="lg" loading={busy} onClick={() => onPay("card")}>
          <CreditCard aria-hidden /> {t.pay(amount)}
        </Button>
      </div>
    </div>
  );
}
