import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { toE164, type ContactRequest } from "@snapbell/sdk";
import type { Request } from "express";
import { z } from "zod";
import { config } from "../config";
import { newId } from "../common/crypto";
import { badRequest } from "../common/errors";
import { RateLimiter, clientIp, nowIso } from "../common/util";
import { parse } from "../common/validate";
import { Repository } from "../store/repository";
import { MessagingService } from "../services/messaging.service";
import { currentLocale, err, notices } from "../i18n";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v || null);

const contactSchema = z.object({
  kind: z.enum(["partner", "contact", "demo", "switch", "data_request"]),
  name: z.string().trim().min(1).max(100),
  company: optionalText(120),
  email: optionalText(200),
  phone: optionalText(40),
  city: optionalText(80),
  message: z.string().trim().max(4000).default(""),
  details: z.record(z.string().max(60), z.string().max(2000)).default({}),
  website: z.string().max(500).optional(),
});

/** Public: the marketing site's contact page, partner requests and demo/switch/data-request forms. */
@Controller("contact-requests")
export class ContactController {
  private readonly limiter = new RateLimiter(5, 10 * 60_000, () => err().rate.contact);

  constructor(
    private readonly repo: Repository,
    private readonly messaging: MessagingService,
  ) {}

  @Post()
  @HttpCode(200)
  submit(@Req() req: Request, @Body() body: unknown): { id: string; received: true } {
    this.limiter.hit(clientIp(req));
    // Honeypot: people never see the "website" field, bots fill it. Pretend success, store nothing.
    const honeypot = (body as { website?: unknown } | null)?.website;
    if (typeof honeypot === "string" && honeypot.trim() !== "") return { id: newId("cr"), received: true };

    const input = parse(contactSchema, body);
    if (Object.keys(input.details).length > 20) throw badRequest("too_many_details", err().contact.tooManyDetails);
    if ((input.kind === "partner" || input.kind === "contact") && !input.message) {
      throw badRequest("message_required", err().contact.messageRequired);
    }
    const email = input.email?.toLowerCase() ?? null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest("invalid_email", err().auth.invalidEmail);
    let phone: string | null = null;
    if (input.phone) {
      phone = toE164(input.phone);
      if (!phone) throw badRequest("invalid_phone", err().auth.invalidPhone);
    }
    if (!email && !phone) throw badRequest("contact_required", err().contact.emailOrPhone);

    const now = nowIso();
    const request: ContactRequest = {
      id: newId("cr"),
      kind: input.kind,
      status: "new",
      name: input.name,
      company: input.company,
      email,
      phone,
      city: input.city,
      message: input.message,
      details: input.details,
      locale: currentLocale(),
      studioId: null,
      note: null,
      createdAt: now,
      updatedAt: now,
    };
    this.repo.contactRequests.insert(request);

    const n = notices();
    const kind = n.contactRequest.kinds[request.kind];
    this.messaging.send({
      studioId: null,
      channel: "email",
      to: config.teamEmail,
      template: "contact_request",
      subject: n.contactRequest.subject(kind, request.name),
      body: n.contactRequest.body(kind, request.name, request.company ?? "", [phone, email].filter(Boolean).join(", "), request.message),
      kind: "transactional",
    });
    return { id: request.id, received: true };
  }
}
