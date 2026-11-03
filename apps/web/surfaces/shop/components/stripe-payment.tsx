"use client";

import { Button } from "@snapbell/ui/button";
import { useFormatters, useLocale, useMessages } from "@snapbell/ui/locale";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { PaymentMethodKind } from "@snapbell/sdk";
import { Lock } from "lucide-react";
import { useState } from "react";
import { getStripe } from "@shop/lib/stripe";
import { checkoutMsgs } from "@shop/messages/checkout";
import type { PayRequest } from "./checkout-form";

/**
 * Stripe Payment Element in deferred-intent mode: card, Apple Pay and Google Pay.
 * We create a PaymentMethod here, the API creates and confirms the PaymentIntent,
 * and 3-D Secure is finished with stripe.handleNextAction in CheckoutForm.
 */
export function StripePayment(props: {
  amountCents: number;
  billing: { name: string; email: string; phone: string | null };
  busy: boolean;
  validate: () => boolean;
  onPay: (req: PayRequest) => Promise<void>;
  onError: (message: string) => void;
}) {
  const locale = useLocale();
  return (
    <Elements
      stripe={getStripe()}
      options={{
        mode: "payment",
        amount: props.amountCents,
        currency: "usd",
        paymentMethodCreation: "manual",
        // Stripe localizes the card form itself; "uz" is not supported, so it falls back to English.
        locale: locale === "uz" ? "auto" : locale,
        appearance: {
          theme: "stripe",
          variables: { borderRadius: "8px", fontFamily: "Inter, system-ui, sans-serif", colorPrimary: "#1c1b1f" },
        },
      }}
    >
      <Inner {...props} />
    </Elements>
  );
}

function Inner({ amountCents, billing, busy, validate, onPay, onError }: Parameters<typeof StripePayment>[0]) {
  const stripe = useStripe();
  const elements = useElements();
  const t = useMessages(checkoutMsgs);
  const fmt = useFormatters();
  const [working, setWorking] = useState(false);

  const submit = async () => {
    if (!stripe || !elements || !validate()) return;
    setWorking(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message ?? t.errors.paymentDetails);
        return;
      }
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        elements,
        params: { billing_details: { name: billing.name, email: billing.email, phone: billing.phone ?? undefined } },
      });
      if (error || !paymentMethod) {
        onError(error?.message ?? t.errors.cardFailed);
        return;
      }
      const wallet = paymentMethod.card?.wallet?.type;
      const method: PaymentMethodKind = wallet === "apple_pay" ? "apple_pay" : wallet === "google_pay" ? "google_pay" : "card";
      await onPay({ method, paymentMethodId: paymentMethod.id, stripe });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="grid gap-4">
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />
      <Button size="lg" block loading={busy || working} disabled={!stripe} onClick={submit}>
        <Lock aria-hidden /> {t.pay(fmt.money(amountCents))}
      </Button>
    </div>
  );
}
