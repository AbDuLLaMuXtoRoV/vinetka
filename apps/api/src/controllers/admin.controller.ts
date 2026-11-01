import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from "@nestjs/common";
import {
  MARKETS,
  toE164,
  type AdminCreateStudioResult,
  type AdminStudioRow,
  type ContactRequest,
  type Studio,
} from "@snapbell/sdk";
import type { Request } from "express";
import { z } from "zod";
import { newId } from "../common/crypto";
import { badRequest, conflict, notFound } from "../common/errors";
import { nowIso, slugify, sum } from "../common/util";
import { cents, id, parse, query } from "../common/validate";
import { Repository } from "../store/repository";
import { AuthService } from "../services/auth.service";
import { CommerceService } from "../services/commerce.service";
import { MessagingService } from "../services/messaging.service";
import { QueueService } from "../services/queue.service";
import { ViewsService } from "../services/views.service";
import { searchOrders } from "./orders.controller";
import { err, notices } from "../i18n";

const createStudioSchema = z.object({
  studioName: z.string().trim().min(1).max(100),
  ownerName: z.string().trim().min(1).max(100),
  ownerEmail: z.email().max(200),
  ownerPhone: z.string().trim().max(40).nullable().optional(),
  markets: z.array(z.enum(MARKETS as [string, ...string[]])).max(MARKETS.length).optional(),
  contactRequestId: id.nullable().optional(),
});

const contactStatus = z.enum(["new", "contacted", "converted", "archived"]);

/** Internal support console (admin.snapbell.com). Every route needs an internal admin token. */
@Controller("admin")
export class AdminController {
  constructor(
    private readonly repo: Repository,
    private readonly auth: AuthService,
    private readonly views: ViewsService,
    private readonly commerce: CommerceService,
    private readonly queue: QueueService,
    private readonly messaging: MessagingService,
  ) {}

  @Post("login")
  @HttpCode(200)
  login(@Req() req: Request, @Body() body: unknown) {
    const input = parse(z.object({ email: z.string().min(3).max(200), password: z.string().min(1).max(200) }), body);
    return this.auth.adminLogin(req, input.email, input.password);
  }

  private studioRow(studio: Studio): AdminStudioRow {
    const owner = this.repo.members.find((m) => m.studioId === studio.id && m.role === "owner");
    const jobs = this.repo.jobs.filter((j) => j.studioId === studio.id);
    const orders = this.views.paidOrders((o) => o.studioId === studio.id);
    return {
      studio: {
        id: studio.id,
        name: studio.name,
        slug: studio.slug,
        createdAt: studio.createdAt,
        markets: studio.markets,
        stripeStatus: studio.stripe.status,
        onboardingDone: studio.onboarding.done,
      },
      ownerName: owner?.name ?? "",
      ownerEmail: owner?.email ?? "",
      ownerStatus: owner?.status ?? "invited",
      ownerMemberId: owner?.id ?? "",
      jobs: jobs.length,
      liveJobs: jobs.filter((j) => j.status === "live").length,
      salesCents: sum(orders, (o) => this.views.netSales(o)),
      platformFeesCents: sum(orders, (o) => o.split.platformFeeCents),
    };
  }

  @Get("studios")
  studios(@Req() req: Request, @Query() q: Record<string, unknown>): AdminStudioRow[] {
    this.auth.admin(req);
    const text = query(q, "q")?.toLowerCase();
    return this.repo.studios
      .all()
      .map((studio) => this.studioRow(studio))
      .filter((row) => !text || `${row.studio.name} ${row.studio.slug} ${row.ownerName} ${row.ownerEmail}`.toLowerCase().includes(text))
      .sort((a, b) => b.salesCents - a.salesCents || b.studio.createdAt.localeCompare(a.studio.createdAt));
  }

  /** The only way a studio comes into existence. The owner finishes through a one-time setup link. */
  @Post("studios")
  createStudio(@Req() req: Request, @Body() body: unknown): AdminCreateStudioResult {
    this.auth.admin(req);
    const input = parse(createStudioSchema, body);
    const email = input.ownerEmail.trim().toLowerCase();
    if (this.repo.members.find((m) => m.email === email)) throw conflict("email_taken", err().studio.memberExists);
    let phone: string | null = null;
    if (input.ownerPhone) {
      phone = toE164(input.ownerPhone);
      if (!phone) throw badRequest("invalid_phone", err().auth.invalidPhone);
    }
    const request = input.contactRequestId ? this.repo.contactRequests.get(input.contactRequestId) : null;
    if (input.contactRequestId && !request) throw notFound(err().notFound.contactRequest);
    if (request?.studioId) throw conflict("request_converted", err().studio.requestConverted);

    const base = slugify(input.studioName) || "studio";
    let slug = base;
    for (let n = 2; this.repo.studios.find((s) => s.slug === slug); n++) slug = `${base}-${n}`;
    const studio: Studio = {
      id: newId("stu"),
      name: input.studioName,
      slug,
      logoUrl: null,
      brandColor: "#F5B700",
      markets: (input.markets as Studio["markets"] | undefined)?.length ? (input.markets as Studio["markets"]) : ["schools"],
      albumDomain: null,
      defaultLabId: null,
      stripe: { status: "not_connected", accountId: null, payoutSchedule: "weekly", requirementsDue: [] },
      taxInfo: { legalName: input.studioName, ein: null, address: null },
      onboarding: { completed: [], done: false },
      bigOrderThresholdCents: 15_000,
      ytdSalesCents: 0,
      createdAt: nowIso(),
    };
    this.repo.studios.insert(studio);
    const owner = this.repo.members.insert({
      id: newId("mem"),
      studioId: studio.id,
      name: input.ownerName,
      email,
      phone,
      role: "owner",
      status: "invited",
      twoFactorEnabled: false,
      passwordHash: null,
    });
    const setupLink = this.auth.issueSetupLink(owner);
    this.messaging.send({
      studioId: studio.id,
      channel: "email",
      to: email,
      template: "studio_welcome",
      subject: notices().studioWelcome.subject(studio.name),
      body: notices().studioWelcome.body(owner.name, studio.name, setupLink.url),
      // Never keep the live link in the log.
      logBody: notices().studioWelcome.body(owner.name, studio.name, "[setup link]"),
      kind: "transactional",
    });
    if (request) Object.assign(request, { status: "converted", studioId: studio.id, updatedAt: nowIso() });
    return { studio: this.studioRow(studio), owner: this.views.member(owner), setupLink };
  }

  /** New "choose your password" link for anyone who hasn't finished setup; older links stop working. */
  @Post("members/:id/setup-link")
  @HttpCode(200)
  memberSetupLink(@Req() req: Request, @Param("id") memberId: string) {
    this.auth.admin(req);
    const member = this.repo.members.get(memberId);
    if (!member) throw notFound(err().notFound.member);
    if (member.status !== "invited") throw conflict("member_active", err().auth.alreadySetUp);
    return this.auth.issueSetupLink(member);
  }

  // --- Contact page, partner and demo requests ---------------------------------------

  @Get("contact-requests")
  contactRequests(@Req() req: Request, @Query() q: Record<string, unknown>): ContactRequest[] {
    this.auth.admin(req);
    const status = query(q, "status");
    const kind = query(q, "kind");
    const text = query(q, "q")?.toLowerCase();
    return this.repo.contactRequests
      .filter(
        (r) =>
          (!status || r.status === status) &&
          (!kind || r.kind === kind) &&
          (!text || [r.name, r.company, r.email, r.phone, r.city, r.message].some((f) => f?.toLowerCase().includes(text))),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  @Patch("contact-requests/:id")
  updateContactRequest(@Req() req: Request, @Param("id") requestId: string, @Body() body: unknown): ContactRequest {
    this.auth.admin(req);
    const request = this.repo.contactRequests.get(requestId);
    if (!request) throw notFound(err().notFound.contactRequest);
    const input = parse(z.object({ status: contactStatus.optional(), note: z.string().trim().max(2000).nullable().optional() }), body);
    if (input.status) request.status = input.status;
    if (input.note !== undefined) request.note = input.note || null;
    request.updatedAt = nowIso();
    return request;
  }

  @Get("jobs")
  jobs(@Req() req: Request, @Query() q: Record<string, unknown>) {
    this.auth.admin(req);
    const text = query(q, "q")?.toLowerCase();
    const status = query(q, "status");
    return this.repo.jobs
      .filter((j) => !status || j.status === status)
      .map((j) => ({ ...this.views.jobSummary(j), studioName: this.repo.studios.get(j.studioId)?.name ?? "" }))
      .filter((j) => !text || `${j.name} ${j.organizationName} ${j.studioName} ${j.sharedAccessCode ?? ""}`.toLowerCase().includes(text))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  @Get("orders")
  orders(@Req() req: Request, @Query() q: Record<string, unknown>) {
    this.auth.admin(req);
    return this.views
      .byNewest(searchOrders(this.views.paidOrders(), q))
      .slice(0, 500)
      .map((o) => ({ ...this.views.orderSummary(o), studioName: o.studioName }));
  }

  @Get("orders/:id")
  order(@Req() req: Request, @Param("id") orderId: string) {
    this.auth.admin(req);
    const order = this.repo.orders.get(orderId);
    if (!order) throw notFound(err().notFound.order);
    return this.views.order(order);
  }

  @Post("orders/:id/refund")
  @HttpCode(200)
  async refund(@Req() req: Request, @Param("id") orderId: string, @Body() body: unknown) {
    this.auth.admin(req);
    const order = this.repo.orders.get(orderId);
    if (!order) throw notFound(err().notFound.order);
    const input = parse(z.object({ amountCents: cents.min(1).optional(), reason: z.string().trim().min(1).max(500) }), body);
    return this.views.order(await this.commerce.refund(order, input));
  }

  @Get("lab-queue")
  labQueue(@Req() req: Request, @Query() q: Record<string, unknown>) {
    this.auth.admin(req);
    const status = query(q, "status");
    return this.repo.labSubmissions
      .filter((s) => !status || s.status === status)
      .sort((a, b) => Number(b.status === "failed") - Number(a.status === "failed") || b.updatedAt.localeCompare(a.updatedAt));
  }

  @Post("lab-queue/:id/retry")
  @HttpCode(200)
  retry(@Req() req: Request, @Param("id") submissionId: string) {
    this.auth.admin(req);
    const submission = this.repo.labSubmissions.get(submissionId);
    if (!submission) throw notFound(err().notFound.labSubmission);
    Object.assign(submission, { status: "submitted", attempts: submission.attempts + 1, lastError: null, updatedAt: nowIso() });
    void this.queue.enqueue("labs", { submissionId: submission.id, orderId: submission.orderId, labId: submission.labId, retry: true });
    return submission;
  }

  @Get("messages")
  messages(@Req() req: Request, @Query() q: Record<string, unknown>) {
    this.auth.admin(req);
    const text = query(q, "q")?.toLowerCase();
    const channel = query(q, "channel");
    const status = query(q, "status");
    return this.views
      .byNewest(
        this.repo.messages.filter(
          (m) =>
            (!channel || m.channel === channel) &&
            (!status || m.status === status) &&
            (!text || `${m.to} ${m.template} ${m.body}`.toLowerCase().includes(text)),
        ),
      )
      .slice(0, 500);
  }

  @Get("flags")
  flags(@Req() req: Request) {
    this.auth.admin(req);
    return this.repo.flags.all();
  }

  @Patch("flags/:key")
  updateFlag(@Req() req: Request, @Param("key") key: string, @Body() body: unknown) {
    this.auth.admin(req);
    const flag = this.repo.flags.get(key);
    if (!flag) throw notFound(err().notFound.flag);
    const input = parse(z.object({ enabled: z.boolean().optional(), studioIds: z.array(id).optional() }), body);
    Object.assign(flag, input);
    return flag;
  }
}
