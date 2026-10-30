import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req } from "@nestjs/common";
import { MARKETS, ONBOARDING_STEPS, type HomeSummary, type Organization } from "@snapbell/sdk";
import type { Request } from "express";
import { z } from "zod";
import { config } from "../config";
import { newId } from "../common/crypto";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { DAY_MS, sum } from "../common/util";
import { addressSchema, cents, parse } from "../common/validate";
import { Repository } from "../store/repository";
import { AuthService, MANAGERS_ONLY } from "../services/auth.service";
import { MediaService } from "../services/media.service";
import { MessagingService } from "../services/messaging.service";
import { PaymentsService } from "../services/payments.service";
import { ScopeService } from "../services/scope.service";
import { ViewsService } from "../services/views.service";
import { err, labels, notices, v } from "../i18n";

const studioPatch = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  logoUrl: z.string().max(700_000).nullable().optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: () => v().hexColor }).optional(),
  markets: z.array(z.enum(MARKETS as [string, ...string[]])).optional(),
  albumDomain: z.string().trim().max(200).nullable().optional(),
  defaultLabId: z.string().nullable().optional(),
  taxInfo: z
    .object({ legalName: z.string().trim().min(1).max(200), ein: z.string().trim().max(20).nullable(), address: addressSchema.nullable() })
    .optional(),
  bigOrderThresholdCents: cents.optional(),
  completeOnboardingStep: z.enum(ONBOARDING_STEPS as [string, ...string[]]).optional(),
});

const orgSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(["school", "league", "dance_studio", "preschool", "client"]),
  contactName: z.string().trim().max(200).default(""),
  contactEmail: z.string().trim().max(200).default(""),
  contactPhone: z.string().trim().max(40).nullable().default(null),
  address: addressSchema.nullable().default(null),
});

const orgPatch = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  type: z.enum(["school", "league", "dance_studio", "preschool", "client"]).optional(),
  contactName: z.string().trim().max(200).optional(),
  contactEmail: z.string().trim().max(200).optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  address: addressSchema.nullable().optional(),
});

@Controller()
export class StudioController {
  constructor(
    private readonly repo: Repository,
    private readonly auth: AuthService,
    private readonly views: ViewsService,
    private readonly scope: ScopeService,
    private readonly payments: PaymentsService,
    private readonly messaging: MessagingService,
    private readonly media: MediaService,
  ) {}

  @Get("studio")
  get(@Req() req: Request) {
    return this.auth.staff(req).studio;
  }

  @Patch("studio")
  update(@Req() req: Request, @Body() body: unknown) {
    const { studio } = this.auth.staff(req, MANAGERS_ONLY);
    const { completeOnboardingStep, ...patch } = parse(studioPatch, body);
    if (patch.defaultLabId && !this.repo.labs.get(patch.defaultLabId)) throw badRequest("invalid_lab", err().catalog.unknownLab);
    if (patch.albumDomain && this.repo.studios.find((s) => s.id !== studio.id && s.albumDomain === patch.albumDomain)) {
      throw conflict("domain_taken", err().studio.domainTaken);
    }
    Object.assign(studio, patch);
    if (completeOnboardingStep) this.completeStep(studio, completeOnboardingStep);
    return studio;
  }

  private completeStep(studio: import("@snapbell/sdk").Studio, step: string) {
    const completed = new Set(studio.onboarding.completed);
    completed.add(step as (typeof ONBOARDING_STEPS)[number]);
    // Stripe can be skipped until the first publish, so it doesn't block "done".
    const done = ONBOARDING_STEPS.filter((s) => s !== "stripe").every((s) => completed.has(s));
    studio.onboarding = { completed: ONBOARDING_STEPS.filter((s) => completed.has(s)), done };
  }

  @Get("studio/home")
  home(@Req() req: Request): HomeSummary {
    const { studio } = this.auth.staff(req);
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const orders = this.views.byNewest(this.views.paidOrders((o) => o.studioId === studio.id));
    const today = orders.filter((o) => Date.parse(o.createdAt) >= startOfDay.getTime());
    const week = orders.filter((o) => Date.parse(o.createdAt) >= now - 7 * DAY_MS);
    const jobs = this.repo.jobs.filter((j) => j.studioId === studio.id);
    const live = jobs.filter((j) => j.status === "live").sort((a, b) => (a.deadline ?? "9").localeCompare(b.deadline ?? "9"));

    const todos: HomeSummary["todos"] = [];
    if (studio.stripe.status !== "active") todos.push({ kind: "stripe", label: labels().todos.stripe, href: "/settings/payments", count: 1 });
    for (const job of jobs.filter((j) => j.status !== "closed")) {
      const stats = this.views.jobStats(job);
      if (stats.reviewMatches > 0) todos.push({ kind: "review", label: labels().todos.review(stats.reviewMatches, job.name), href: `/jobs/${job.id}/matching`, count: stats.reviewMatches });
      if (stats.unmatchedPhotos > 0) todos.push({ kind: "unmatched", label: labels().todos.unmatched(stats.unmatchedPhotos, job.name), href: `/jobs/${job.id}/matching`, count: stats.unmatchedPhotos });
      if (job.status === "draft" && Date.parse(job.date) < now + 30 * DAY_MS) todos.push({ kind: "unpublished", label: labels().todos.unpublished(job.name), href: `/jobs/${job.id}`, count: 1 });
      if (job.status === "live" && job.deadline && Date.parse(job.deadline) - now < 3 * DAY_MS && Date.parse(job.deadline) > now) {
        todos.push({ kind: "deadline", label: labels().todos.closesIn(job.name, Math.max(1, Math.round((Date.parse(job.deadline) - now) / DAY_MS))), href: `/jobs/${job.id}`, count: 1 });
      }
    }

    return {
      salesTodayCents: sum(today, (o) => this.views.netSales(o)),
      salesWeekCents: sum(week, (o) => this.views.netSales(o)),
      ordersToday: today.length,
      ordersWeek: week.length,
      openJobs: live.map((j) => this.views.jobSummary(j)),
      todos,
      recentOrders: orders.slice(0, 8).map((o) => ({ ...this.views.orderSummary(o), big: o.split.totalCents >= studio.bigOrderThresholdCents })),
    };
  }

  @Get("studio/members")
  members(@Req() req: Request) {
    const { studio } = this.auth.staff(req);
    return this.repo.members.filter((m) => m.studioId === studio.id).map((m) => this.views.member(m));
  }

  @Post("studio/members")
  invite(@Req() req: Request, @Body() body: unknown) {
    const { studio, member: inviter } = this.auth.staff(req, MANAGERS_ONLY);
    const input = parse(z.object({ email: z.email().max(200), name: z.string().trim().min(1).max(100), role: z.enum(["admin", "photographer"]) }), body);
    const email = input.email.toLowerCase();
    if (this.repo.members.find((m) => m.email === email)) throw conflict("email_taken", err().studio.memberExists);
    const member = this.repo.members.insert({
      id: newId("mem"),
      studioId: studio.id,
      name: input.name,
      email,
      role: input.role,
      status: "invited",
      twoFactorEnabled: false,
      passwordHash: null,
    });
    this.messaging.send({
      studioId: studio.id,
      channel: "email",
      to: email,
      template: "team_invite",
      subject: notices().teamInvite.subject(inviter.name, studio.name),
      body: notices().teamInvite.body(inviter.name, studio.name, notices().roles[input.role], `${config.studioUrl}/login`),
      kind: "transactional",
    });
    return this.views.member(member);
  }

  @Patch("studio/members/:id")
  updateMember(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req, MANAGERS_ONLY);
    const member = this.repo.members.get(id);
    if (!member || member.studioId !== studio.id) throw notFound(err().notFound.member);
    const input = parse(z.object({ role: z.enum(["admin", "photographer"]).optional() }), body);
    if (member.role === "owner") throw forbidden(err().studio.ownerRole);
    if (input.role) member.role = input.role;
    return this.views.member(member);
  }

  @Post("studio/stripe/connect")
  @HttpCode(200)
  async connectStripe(@Req() req: Request) {
    const { studio, member } = this.auth.staff(req, MANAGERS_ONLY);
    const returnUrl = `${config.studioUrl}/settings/payments`;
    if (this.payments.live) {
      const { accountId, url } = await this.payments.connectLink({ accountId: studio.stripe.accountId, email: member.email, studioName: studio.name, returnUrl });
      studio.stripe = { ...studio.stripe, accountId, status: studio.stripe.status === "active" ? "active" : "pending" };
      return { url, studio };
    }
    // Dev: connect instantly.
    studio.stripe = { ...studio.stripe, status: "active", accountId: studio.stripe.accountId ?? `acct_dev_${studio.slug}`, requirementsDue: [] };
    this.completeStep(studio, "stripe");
    return { url: `${returnUrl}?stripe=connected`, studio };
  }

  // --- Organizations ---------------------------------------------------------------

  @Get("organizations")
  organizations(@Req() req: Request) {
    const { studio } = this.auth.staff(req);
    return this.repo.organizations
      .filter((o) => o.studioId === studio.id)
      .map((o) => this.views.organization(o))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  @Get("organizations/:id")
  organization(@Req() req: Request, @Param("id") id: string) {
    const { studio } = this.auth.staff(req);
    const org = this.scope.organization(studio, id);
    const jobs = this.repo.jobs
      .filter((j) => j.organizationId === org.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((j) => this.views.jobSummary(j));
    return { ...this.views.organization(org), jobs, resultsLink: this.media.resultsUrl(org.id) };
  }

  @Post("organizations")
  createOrganization(@Req() req: Request, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const input = parse(orgSchema, body);
    const org: Organization = { id: newId("org"), studioId: studio.id, ...input, jobCount: 0, lifetimeSalesCents: 0 };
    this.repo.organizations.insert(org);
    return this.views.organization(org);
  }

  @Patch("organizations/:id")
  updateOrganization(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const org = this.scope.organization(studio, id);
    Object.assign(org, parse(orgPatch, body));
    return this.views.organization(org);
  }
}
