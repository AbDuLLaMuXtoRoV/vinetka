import { Injectable, Logger } from "@nestjs/common";
import Stripe from "stripe";
import { config } from "../config";
import { ApiError } from "../common/errors";
import { err as msg } from "../i18n";

/**
 * Stripe Connect (Express) with destination charges: the parent's payment lands on
 * the platform, which keeps lab cost + tax + platform fee + card fee as the
 * application fee and transfers the rest to the studio. Without STRIPE_SECRET_KEY
 * every call is simulated by the callers.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger("Payments");
  private readonly stripe: Stripe | null = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

  get live(): boolean {
    return this.stripe !== null;
  }

  async createPaymentIntent(input: {
    amountCents: number;
    applicationFeeCents: number;
    destinationAccountId: string;
    orderId: string;
    orderNumber: string;
    email: string;
  }): Promise<{ id: string; clientSecret: string }> {
    const pi = await this.client().paymentIntents.create({
      amount: input.amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      application_fee_amount: Math.min(input.applicationFeeCents, input.amountCents),
      transfer_data: { destination: input.destinationAccountId },
      receipt_email: input.email,
      description: `Snapbell order ${input.orderNumber}`,
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
    });
    return { id: pi.id, clientSecret: pi.client_secret ?? "" };
  }

  async paymentStatus(paymentIntentId: string): Promise<string> {
    return (await this.client().paymentIntents.retrieve(paymentIntentId)).status;
  }

  async refund(paymentIntentId: string, amountCents: number): Promise<string> {
    const refund = await this.client().refunds.create({
      payment_intent: paymentIntentId,
      amount: amountCents,
      reverse_transfer: true,
      refund_application_fee: true,
    });
    return refund.id;
  }

  /** Creates (or reuses) the studio's Express account and returns an onboarding link. */
  async connectLink(input: { accountId: string | null; email: string; studioName: string; returnUrl: string }): Promise<{ accountId: string; url: string }> {
    const stripe = this.client();
    const accountId =
      input.accountId ??
      (await stripe.accounts.create({ type: "express", email: input.email, business_profile: { name: input.studioName } })).id;
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: input.returnUrl,
      return_url: input.returnUrl,
      type: "account_onboarding",
    });
    return { accountId, url: link.url };
  }

  /** Verifies a webhook signature when STRIPE_WEBHOOK_SECRET is set; otherwise trusts the parsed body (dev). */
  parseEvent(rawBody: Buffer | undefined, signature: string | undefined, parsed: unknown): { type: string; data: { object: Record<string, unknown> } } {
    if (config.stripeWebhookSecret) {
      if (!rawBody || !signature) throw new ApiError(400, "invalid_signature", msg().webhooks.stripeMissingSignature);
      try {
        const stripe = this.stripe ?? new Stripe("sk_test_placeholder");
        return stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret) as unknown as {
          type: string;
          data: { object: Record<string, unknown> };
        };
      } catch (err) {
        this.logger.warn(`Stripe signature check failed: ${(err as Error).message}`);
        throw new ApiError(400, "invalid_signature", msg().webhooks.stripeSignatureFailed);
      }
    }
    return parsed as { type: string; data: { object: Record<string, unknown> } };
  }

  private client(): Stripe {
    if (!this.stripe) throw new ApiError(500, "stripe_not_configured", msg().webhooks.stripeNotConfigured);
    return this.stripe;
  }
}
