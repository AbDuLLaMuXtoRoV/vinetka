"use client";

import { Button } from "@snapbell/ui/button";
import { Alert } from "@snapbell/ui/feedback";
import { useFormatters, useLocale, useMessages } from "@snapbell/ui/locale";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { useState } from "react";
import { getStripe } from "@/lib/stripe";
import { passMsgs } from "@/messages/pass";

/** Pays the PaymentIntent the API created for a Picture Day Pass. */
export function PassStripeConfirm({ clientSecret, amountCents, onSuccess }: { clientSecret: string; amountCents: number; onSuccess: () => void }) {
  const locale = useLocale();
  return (
    <Elements
      stripe={getStripe()}
      // Stripe has no Uzbek; "auto" falls back to the browser language or English.
      options={{ clientSecret, locale: locale === "uz" ? "auto" : locale, appearance: { theme: "stripe", variables: { borderRadius: "8px" } } }}
    >
      <Inner amountCents={amountCents} onSuccess={onSuccess} />
    </Elements>
  );
}

function Inner({ amountCents, onSuccess }: { amountCents: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const t = useMessages(passMsgs);
  const fmt = useFormatters();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setBusy(true);
        setError(null);
        const res = await stripe.confirmPayment({ elements, redirect: "if_required", confirmParams: { return_url: window.location.href } });
        setBusy(false);
        if (res.error) setError(res.error.message ?? t.errors.paymentFailed);
        else onSuccess();
      }}
    >
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" size="lg" block loading={busy} disabled={!stripe}>
        <Lock aria-hidden /> {t.payOnly(fmt.money(amountCents))}
      </Button>
    </form>
  );
}
