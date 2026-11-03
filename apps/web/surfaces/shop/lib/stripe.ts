import { loadStripe, type Stripe } from "@stripe/stripe-js";

export const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

let promise: Promise<Stripe | null> | null = null;

/** Loaded lazily, only when checkout renders with a key configured. */
export function getStripe(): Promise<Stripe | null> | null {
  if (!stripePublishableKey) return null;
  promise ??= loadStripe(stripePublishableKey);
  return promise;
}
