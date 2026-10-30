import { Body, Controller, Get, Headers, HttpCode, Logger, Param, Post, Req, Res, type RawBodyRequest } from "@nestjs/common";
import type { Request, Response } from "express";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { config } from "../config";
import { safeEqual } from "../common/crypto";
import { ApiError, notFound } from "../common/errors";
import { nowIso } from "../common/util";
import { parse } from "../common/validate";
import { Repository } from "../store/repository";
import { CommerceService } from "../services/commerce.service";
import { MessagingService } from "../services/messaging.service";
import { PaymentsService } from "../services/payments.service";
import { QueueService } from "../services/queue.service";
import { err, notices } from "../i18n";

const labEvent = z.object({
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
  event: z.enum(["accepted", "shipped", "delivered", "failed"]),
  tracking: z.object({ carrier: z.string().min(1), number: z.string().min(1), url: z.url() }).optional(),
  error: z.string().max(500).optional(),
});

@Controller()
export class WebhooksController {
  private readonly logger = new Logger("Webhooks");

  constructor(
    private readonly repo: Repository,
    private readonly commerce: CommerceService,
    private readonly payments: PaymentsService,
    private readonly messaging: MessagingService,
    private readonly queue: QueueService,
  ) {}

  @Post("webhooks/stripe")
  @HttpCode(200)
  stripe(@Req() req: RawBodyRequest<Request>, @Headers("stripe-signature") signature: string | undefined) {
    const event = this.payments.parseEvent(req.rawBody, signature, req.body);
    const object = event.data?.object ?? {};
    if (event.type === "payment_intent.succeeded") {
      const metadata = (object.metadata ?? {}) as Record<string, string>;
      const order =
        (metadata.orderId ? this.repo.orders.get(metadata.orderId) : undefined) ??
        this.repo.orders.find((o) => o.paymentIntentId === object.id);
      if (order) this.commerce.finalizePaid(order);
    } else if (event.type === "payment_intent.payment_failed") {
      this.logger.warn(`Payment failed for ${String(object.id)}`);
    }
    return { received: true };
  }

  /** Lab status updates. With LAB_WEBHOOK_SECRET set, X-Snapbell-Signature must be the hex HMAC-SHA256 of the raw body. */
  @Post("webhooks/lab/:lab")
  @HttpCode(200)
  lab(@Req() req: RawBodyRequest<Request>, @Param("lab") labId: string, @Headers("x-snapbell-signature") signature: string | undefined, @Body() body: unknown) {
    if (config.labWebhookSecret) {
      const expected = createHmac("sha256", config.labWebhookSecret).update(req.rawBody ?? Buffer.alloc(0)).digest("hex");
      if (!signature || !safeEqual(signature, expected)) throw new ApiError(401, "invalid_signature", err().webhooks.labSignature);
    }
    if (!this.repo.labs.get(labId)) throw notFound(err().notFound.lab);
    const input = parse(labEvent, body);
    const order = input.orderId ? this.repo.orders.get(input.orderId) : this.repo.orders.find((o) => o.number === input.orderNumber);
    if (!order) throw notFound(err().notFound.order);
    const submission = this.repo.labSubmissions.find((s) => s.orderId === order.id && s.labId === labId) ?? this.repo.labSubmissions.find((s) => s.orderId === order.id);
    const now = nowIso();
    const refunded = order.status === "refunded";
    const keepStatus = refunded || order.status === "partially_refunded";
    const stamp = (i: number) => {
      const step = order.timeline[i];
      if (step && !step.at) step.at = now;
    };

    switch (input.event) {
      case "accepted":
        stamp(1);
        if (!keepStatus) order.status = "at_lab";
        if (submission) Object.assign(submission, { status: "accepted", updatedAt: now });
        break;
      case "shipped":
        stamp(1);
        stamp(2);
        if (!keepStatus) order.status = "shipped";
        if (input.tracking) order.tracking = input.tracking;
        if (submission) Object.assign(submission, { status: "shipped", updatedAt: now });
        if (!refunded) {
          const sms = !!order.contact.phone;
          const t = notices(this.repo.parents.get(order.parentId)?.locale ?? "en");
          this.messaging.send({
            studioId: order.studioId,
            channel: sms ? "sms" : "email",
            to: sms ? order.contact.phone! : order.contact.email,
            template: "order_shipped",
            subject: t.shipped.subject(order.number),
            body: t.shipped.body(order.studioName, order.number, order.tracking?.url ?? null),
            orderId: order.id,
            jobId: order.jobId,
            parentId: order.parentId,
            kind: "transactional",
          });
        }
        break;
      case "delivered":
        stamp(1);
        stamp(2);
        stamp(3);
        if (!keepStatus) order.status = "delivered";
        break;
      case "failed":
        if (submission) {
          Object.assign(submission, { status: "failed", attempts: submission.attempts + 1, lastError: input.error ?? "Lab rejected the order.", updatedAt: now });
        }
        break;
    }
    return { received: true };
  }

  /** Inbound SMS: STOP / START keywords. Replies with TwiML. */
  @Post("webhooks/twilio")
  twilio(@Req() req: Request, @Headers("x-twilio-signature") signature: string | undefined, @Body() body: Record<string, string>, @Res() res: Response) {
    if (config.twilio.authToken) {
      const url = `${config.publicApiUrl}${req.originalUrl}`;
      const data = Object.keys(body ?? {})
        .sort()
        .reduce((acc, key) => acc + key + body[key], url);
      const expected = createHmac("sha1", config.twilio.authToken).update(data).digest("base64");
      if (!signature || !safeEqual(signature, expected)) throw new ApiError(401, "invalid_signature", err().webhooks.twilioSignature);
    }
    const reply = body?.From && typeof body.Body === "string" ? this.messaging.inboundSms(body.From, body.Body) : null;
    const xml = reply ? `<Response><Message>${reply.replace(/[<&>]/g, "")}</Message></Response>` : "<Response></Response>";
    res.status(200).type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>${xml}`);
  }

  @Get("health")
  health() {
    return {
      ok: true,
      store: "memory",
      queue: this.queue.enabled ? "bullmq" : "inline",
      payments: this.payments.live ? "stripe" : "simulated",
      time: nowIso(),
    };
  }
}
