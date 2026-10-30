import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { AdminStudioRow } from "@snapbell/sdk";
import type { Request } from "express";
import { z } from "zod";
import { notFound } from "../common/errors";
import { nowIso, sum } from "../common/util";
import { cents, id, parse, query } from "../common/validate";
import { Repository } from "../store/repository";
import { AuthService } from "../services/auth.service";
import { CommerceService } from "../services/commerce.service";
import { QueueService } from "../services/queue.service";
import { ViewsService } from "../services/views.service";
import { searchOrders } from "./orders.controller";
import { err } from "../i18n";

/** Internal support console (admin.snapbell.com). Every route needs an internal admin token. */
@Controller("admin")
export class AdminController {
  constructor(
    private readonly repo: Repository,
    private readonly auth: AuthService,
    private readonly views: ViewsService,
    private readonly commerce: CommerceService,
    private readonly queue: QueueService,
  ) {}

  @Post("login")
  @HttpCode(200)
  login(@Req() req: Request, @Body() body: unknown) {
    const input = parse(z.object({ email: z.string().min(3).max(200), password: z.string().min(1).max(200) }), body);
    return this.auth.adminLogin(req, input.email, input.password);
  }

  @Get("studios")
  studios(@Req() req: Request, @Query() q: Record<string, unknown>): AdminStudioRow[] {
    this.auth.admin(req);
    const text = query(q, "q")?.toLowerCase();
    return this.repo.studios
      .all()
      .map((studio) => {
        const owner = this.repo.members.find((m) => m.studioId === studio.id && m.role === "owner");
        const jobs = this.repo.jobs.filter((j) => j.studioId === studio.id);
        const orders = this.views.paidOrders((o) => o.studioId === studio.id);
        return {
          studio: { id: studio.id, name: studio.name, slug: studio.slug, createdAt: studio.createdAt, markets: studio.markets, stripeStatus: studio.stripe.status },
          ownerEmail: owner?.email ?? "",
          jobs: jobs.length,
          liveJobs: jobs.filter((j) => j.status === "live").length,
          salesCents: sum(orders, (o) => this.views.netSales(o)),
          platformFeesCents: sum(orders, (o) => o.split.platformFeeCents),
        };
      })
      .filter((row) => !text || `${row.studio.name} ${row.studio.slug} ${row.ownerEmail}`.toLowerCase().includes(text))
      .sort((a, b) => b.salesCents - a.salesCents);
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
