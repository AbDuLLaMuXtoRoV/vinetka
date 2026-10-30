import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from "@nestjs/common";
import {
  MARKETS,
  generateCode,
  normalizeCode,
  type ExportJob,
  type Job,
  type ScheduledMessage,
  type Studio,
  type Subject,
} from "@snapbell/sdk";
import type { Request } from "express";
import { z } from "zod";
import { config } from "../config";
import { newId } from "../common/crypto";
import { badRequest, conflict } from "../common/errors";
import { DAY_MS, later, nowIso, parseCsv, unique } from "../common/util";
import { id, isoDate, parse, query } from "../common/validate";
import { Repository } from "../store/repository";
import { AlbumsService, type ResolvedAlbum } from "../services/albums.service";
import { AuthService } from "../services/auth.service";
import { MediaService } from "../services/media.service";
import { MessagingService } from "../services/messaging.service";
import { QueueService } from "../services/queue.service";
import { ScopeService } from "../services/scope.service";
import { ViewsService } from "../services/views.service";
import { err, fmt, notices, v } from "../i18n";

const protection = z.object({
  watermark: z.boolean(),
  identityOverlay: z.boolean(),
  blurOnFocusLoss: z.boolean(),
  blockDownload: z.boolean(),
});
const downloads = z.object({ allowDigital: z.boolean(), allowDownloadAll: z.boolean() });
const shipping = z
  .object({ home: z.boolean(), schoolPickup: z.boolean() })
  .refine((s) => s.home || s.schoolPickup, { error: () => v().deliveryOption });
const nullableDate = isoDate.nullable();

const jobFields = {
  name: z.string().trim().min(1).max(200),
  organizationId: id,
  market: z.enum(MARKETS as [string, ...string[]]),
  date: isoDate,
  albumType: z.enum(["personal", "team", "open"]),
  priceSheetId: id,
  shipping,
  publishAt: nullableDate.optional(),
  deadline: nullableDate.optional(),
  expiresAt: nullableDate.optional(),
  protection: protection.optional(),
  downloads: downloads.optional(),
};
const jobCreate = z.object(jobFields);
const jobPatch = z.object(jobFields).partial();

const subjectInput = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  group: z.string().trim().max(100).default(""),
  accessCode: z.string().trim().max(12).optional(),
});
const subjectPatch = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  group: z.string().trim().max(100).optional(),
  accessCode: z.string().trim().max(12).optional(),
});

@Controller()
export class JobsController {
  constructor(
    private readonly repo: Repository,
    private readonly auth: AuthService,
    private readonly views: ViewsService,
    private readonly scope: ScopeService,
    private readonly albums: AlbumsService,
    private readonly messaging: MessagingService,
    private readonly media: MediaService,
    private readonly queue: QueueService,
  ) {}

  // --- Jobs ---------------------------------------------------------------------------

  @Get("jobs")
  list(@Req() req: Request, @Query() q: Record<string, unknown>) {
    const { studio } = this.auth.staff(req);
    const status = query(q, "status");
    const search = query(q, "q")?.toLowerCase();
    return this.repo.jobs
      .filter((j) => j.studioId === studio.id && (!status || j.status === status))
      .map((j) => this.views.jobSummary(j))
      .filter((j) => !search || `${j.name} ${j.organizationName}`.toLowerCase().includes(search))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  @Get("jobs/:id")
  get(@Req() req: Request, @Param("id") jobId: string) {
    const { studio } = this.auth.staff(req);
    return this.views.jobDetail(this.scope.job(studio, jobId));
  }

  @Post("jobs")
  create(@Req() req: Request, @Body() body: unknown): Job {
    const { studio } = this.auth.staff(req);
    const input = parse(jobCreate, body);
    const org = this.scope.organization(studio, input.organizationId);
    this.scope.priceSheet(studio, input.priceSheetId);
    const job: Job = {
      id: newId("job"),
      studioId: studio.id,
      organizationId: org.id,
      organizationName: org.name,
      name: input.name,
      market: input.market as Job["market"],
      date: input.date,
      albumType: input.albumType,
      status: "draft",
      priceSheetId: input.priceSheetId,
      shipping: input.shipping,
      sharedAccessCode: input.albumType === "personal" ? null : this.freshCode(),
      publishAt: input.publishAt ?? null,
      deadline: input.deadline ?? null,
      expiresAt: input.expiresAt ?? null,
      protection: input.protection ?? { watermark: true, identityOverlay: true, blurOnFocusLoss: true, blockDownload: true },
      downloads: input.downloads ?? { allowDigital: true, allowDownloadAll: true },
      createdAt: nowIso(),
    };
    this.repo.jobs.insert(job);
    this.createDefaultMessages(job);
    return job;
  }

  @Patch("jobs/:id")
  update(@Req() req: Request, @Param("id") jobId: string, @Body() body: unknown): Job {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const input = parse(jobPatch, body);
    if (input.organizationId) {
      const org = this.scope.organization(studio, input.organizationId);
      job.organizationName = org.name;
    }
    if (input.priceSheetId) this.scope.priceSheet(studio, input.priceSheetId);
    const { market, ...rest } = input;
    Object.assign(job, rest, market ? { market: market as Job["market"] } : {});
    if (job.albumType !== "personal" && !job.sharedAccessCode) {
      job.sharedAccessCode = this.freshCode();
      for (const s of this.repo.subjects.filter((x) => x.jobId === job.id)) s.accessCode = job.sharedAccessCode;
    }
    if (input.publishAt !== undefined || input.deadline !== undefined) this.reschedule(job);
    return job;
  }

  @Post("jobs/:id/publish")
  @HttpCode(200)
  publish(@Req() req: Request, @Param("id") jobId: string): Job {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const blockers = this.views.publishBlockers(job);
    if (blockers.length) {
      throw conflict("publish_blocked", err().jobs.publishBlocked(blockers.map((b) => b.label).join("; ")), {
        details: blockers.map((b) => ({ key: b.key, label: b.label, href: b.href })),
      });
    }
    const wasLive = job.status === "live";
    job.status = "live";
    if (!job.publishAt || Date.parse(job.publishAt) > Date.now()) job.publishAt = nowIso();
    if (!wasLive) this.announce(job, studio);
    this.reschedule(job);
    return job;
  }

  @Post("jobs/:id/close")
  @HttpCode(200)
  close(@Req() req: Request, @Param("id") jobId: string): Job {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    job.status = "closed";
    return job;
  }

  @Post("jobs/:id/extend")
  @HttpCode(200)
  extend(@Req() req: Request, @Param("id") jobId: string, @Body() body: unknown): Job {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const { deadline } = parse(z.object({ deadline: isoDate }), body);
    if (Date.parse(deadline) <= Date.now()) throw badRequest("invalid_deadline", err().jobs.deadlineInFuture);
    job.deadline = deadline;
    if (!job.expiresAt || Date.parse(job.expiresAt) < Date.parse(deadline)) job.expiresAt = new Date(Date.parse(deadline) + 60 * DAY_MS).toISOString();
    if (job.status === "closed") job.status = "live";
    this.reschedule(job);
    return job;
  }

  @Post("jobs/:id/duplicate")
  duplicate(@Req() req: Request, @Param("id") jobId: string): Job {
    const { studio } = this.auth.staff(req);
    const source = this.scope.job(studio, jobId);
    const job: Job = {
      ...structuredClone(source),
      id: newId("job"),
      name: `${source.name} (copy)`,
      status: "draft",
      sharedAccessCode: source.albumType === "personal" ? null : this.freshCode(),
      publishAt: null,
      deadline: null,
      expiresAt: null,
      createdAt: nowIso(),
    };
    this.repo.jobs.insert(job);
    this.createDefaultMessages(job);
    return job;
  }

  @Get("jobs/:id/preview")
  preview(@Req() req: Request, @Param("id") jobId: string) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    let r: ResolvedAlbum;
    if (job.albumType === "personal") {
      const subjects = this.repo.subjects.filter((s) => s.jobId === job.id);
      const subject = subjects.find((s) => this.repo.photos.find((p) => p.subjectIds.includes(s.id))) ?? subjects[0] ?? null;
      r = { code: subject?.accessCode ?? "PREVIEW", job, studio, subject };
    } else {
      r = { code: job.sharedAccessCode ?? "PREVIEW", job, studio, subject: null };
    }
    return this.albums.build(r, null, { preview: true });
  }

  @Get("jobs/:id/orders")
  orders(@Req() req: Request, @Param("id") jobId: string) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    return this.views.byNewest(this.views.paidOrders((o) => o.jobId === job.id)).map((o) => this.views.orderSummary(o));
  }

  @Get("jobs/:id/bulk-batches")
  bulkBatches(@Req() req: Request, @Param("id") jobId: string) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    return this.repo.bulkBatches
      .filter((b) => b.jobId === job.id)
      .map((b) => ({ id: b.id, orders: b.orderIds.length, status: b.status, releasedAt: b.releasedAt }));
  }

  @Post("jobs/:id/bulk-batches/:batchId/release")
  @HttpCode(200)
  releaseBatch(@Req() req: Request, @Param("id") jobId: string, @Param("batchId") batchId: string) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const batch = this.repo.bulkBatches.get(batchId);
    if (!batch || batch.jobId !== job.id) throw badRequest("invalid_batch", err().jobs.batchNotFound);
    if (batch.status !== "collecting") throw conflict("already_released", err().jobs.batchReleased);
    if (batch.orderIds.length === 0) throw conflict("empty_batch", err().jobs.batchEmpty);
    batch.status = "released";
    batch.releasedAt = nowIso();
    for (const sub of this.repo.labSubmissions.filter((s) => batch.orderIds.includes(s.orderId) && s.status === "queued")) {
      sub.status = "submitted";
      sub.attempts += 1;
      sub.updatedAt = batch.releasedAt;
      void this.queue.enqueue("labs", { submissionId: sub.id, orderId: sub.orderId, labId: sub.labId });
    }
    return { ok: true as const };
  }

  // --- Scheduled messages ---------------------------------------------------------------

  @Get("jobs/:id/messages")
  messages(@Req() req: Request, @Param("id") jobId: string) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    return this.repo.scheduledMessages
      .filter((m) => m.jobId === job.id)
      .sort((a, b) => (a.sendAt ?? "9999").localeCompare(b.sendAt ?? "9999"));
  }

  @Patch("jobs/:id/messages/:messageId")
  updateMessage(@Req() req: Request, @Param("id") jobId: string, @Param("messageId") messageId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const message = this.repo.scheduledMessages.get(messageId);
    if (!message || message.jobId !== job.id) throw badRequest("invalid_message", err().jobs.messageNotFound);
    const input = parse(
      z.object({
        sendAt: nullableDate.optional(),
        subject: z.string().trim().max(200).optional(),
        body: z.string().trim().min(1).max(1_000).optional(),
        enabled: z.boolean().optional(),
        channel: z.enum(["sms", "email", "both"]).optional(),
      }),
      body,
    );
    Object.assign(message, input);
    return message;
  }

  @Post("jobs/:id/messages/:messageId/test")
  @HttpCode(200)
  testMessage(@Req() req: Request, @Param("id") jobId: string, @Param("messageId") messageId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const message = this.repo.scheduledMessages.get(messageId);
    if (!message || message.jobId !== job.id) throw badRequest("invalid_message", err().jobs.messageNotFound);
    const { to } = parse(z.object({ to: z.string().trim().min(3).max(200) }), body);
    const channel = message.channel === "both" ? (to.includes("@") ? "email" : "sms") : message.channel;
    return this.messaging.send({
      studioId: studio.id,
      channel,
      to,
      template: `test:${message.kind}`,
      subject: `${notices().testPrefix} ${this.render(message.subject, job, studio)}`,
      body: `${notices().testPrefix} ${this.render(message.body, job, studio)}`,
      jobId: job.id,
      kind: "transactional",
    });
  }

  // --- Exports ------------------------------------------------------------------------

  @Get("jobs/:id/exports")
  exports(@Req() req: Request, @Param("id") jobId: string) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    return this.views.byNewest(this.repo.exports.filter((e) => e.jobId === job.id)).map((e) => this.exportView(e));
  }

  @Post("jobs/:id/exports")
  createExport(@Req() req: Request, @Param("id") jobId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const input = parse(z.object({ type: z.enum(["subjects_csv", "yearbook", "images_by_label"]), label: z.string().trim().max(50).optional() }), body);
    if (input.type === "images_by_label" && !input.label) throw badRequest("label_required", err().jobs.labelRequired);
    const exp: ExportJob = { id: newId("exp"), jobId: job.id, type: input.type, label: input.label ?? null, status: "queued", url: null, createdAt: nowIso() };
    this.repo.exports.insert(exp);
    // Runs as a background job; the studio is emailed when it's ready.
    later(300, () => (exp.status = "running"));
    later(1_200, () => {
      exp.status = "ready";
      const owner = this.repo.members.find((m) => m.studioId === studio.id && m.role === "owner");
      if (owner) {
        this.messaging.send({
          studioId: studio.id,
          channel: "email",
          to: owner.email,
          template: "export_ready",
          subject: notices().exportReady.subject(notices().exportTypes[exp.type]),
          body: notices().exportReady.body(job.name, this.media.exportUrl(exp.id)),
          jobId: job.id,
          kind: "transactional",
        });
      }
    });
    return this.exportView(exp);
  }

  private exportView(e: ExportJob): ExportJob {
    return { ...e, url: e.status === "ready" ? this.media.exportUrl(e.id) : null };
  }

  // --- Roster -------------------------------------------------------------------------

  @Get("jobs/:id/subjects")
  subjects(@Req() req: Request, @Param("id") jobId: string) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    return this.repo.subjects
      .filter((s) => s.jobId === job.id)
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
      .map((s) => this.views.subject(s));
  }

  @Post("jobs/:id/subjects")
  createSubject(@Req() req: Request, @Param("id") jobId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const input = parse(subjectInput, body);
    const subject: Subject = {
      id: newId("sub"),
      jobId: job.id,
      firstName: input.firstName,
      lastName: input.lastName,
      group: input.group,
      accessCode: this.codeFor(job, input.accessCode),
      referencePhotoUrl: null,
      matchedPhotoCount: 0,
      purchased: false,
    };
    this.repo.subjects.insert(subject);
    return this.views.subject(subject);
  }

  @Patch("subjects/:id")
  updateSubject(@Req() req: Request, @Param("id") subjectId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const subject = this.scope.subject(studio, subjectId);
    const job = this.repo.jobs.get(subject.jobId)!;
    const { accessCode, ...rest } = parse(subjectPatch, body);
    Object.assign(subject, rest);
    if (accessCode !== undefined && job.albumType === "personal") subject.accessCode = this.codeFor(job, accessCode, subject.id);
    return this.views.subject(subject);
  }

  @Delete("subjects/:id")
  removeSubject(@Req() req: Request, @Param("id") subjectId: string) {
    const { studio } = this.auth.staff(req);
    const subject = this.scope.subject(studio, subjectId);
    for (const m of this.repo.matches.filter((x) => x.subjectId === subject.id)) this.repo.matches.remove(m.id);
    for (const p of this.repo.photos.filter((x) => x.subjectIds.includes(subject.id))) p.subjectIds = p.subjectIds.filter((s) => s !== subject.id);
    for (const ps of this.repo.parentSubjects.filter((x) => x.subjectId === subject.id)) this.repo.parentSubjects.remove(ps.id);
    this.repo.subjects.remove(subject.id);
    return { ok: true as const };
  }

  @Post("jobs/:id/subjects/import")
  @HttpCode(200)
  importSubjects(@Req() req: Request, @Param("id") jobId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const input = parse(
      z.object({
        csv: z.string().min(1).max(5_000_000),
        mapping: z.object({ firstName: z.string().min(1), lastName: z.string().min(1), group: z.string().min(1), accessCode: z.string().optional() }),
      }),
      body,
    );
    const rows = parseCsv(input.csv);
    const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
    const col = (name: string | undefined) => (name ? header.indexOf(name.trim().toLowerCase()) : -1);
    const idx = { first: col(input.mapping.firstName), last: col(input.mapping.lastName), group: col(input.mapping.group), code: col(input.mapping.accessCode) };
    const missing = Object.entries({ firstName: idx.first, lastName: idx.last, group: idx.group }).filter(([, i]) => i < 0).map(([k]) => k);
    if (input.mapping.accessCode && idx.code < 0) missing.push("accessCode");
    if (missing.length) throw badRequest("invalid_mapping", err().jobs.csvColumnsMissing(missing.join(", ")), { missing, header: rows[0] ?? [] });
    if (rows.length - 1 > 5_000) throw badRequest("too_many_rows", err().jobs.csvTooManyRows);

    const result = { imported: 0, updated: 0, errors: [] as Array<{ row: number; message: string }> };
    const existing = this.repo.subjects.filter((s) => s.jobId === job.id);
    rows.slice(1).forEach((cells, i) => {
      const row = i + 2;
      const firstName = (cells[idx.first] ?? "").trim();
      const lastName = (cells[idx.last] ?? "").trim();
      const group = (cells[idx.group] ?? "").trim();
      const rawCode = idx.code >= 0 ? (cells[idx.code] ?? "").trim() : "";
      if (!firstName || !lastName) {
        result.errors.push({ row, message: !firstName ? err().jobs.missingFirstName : err().jobs.missingLastName });
        return;
      }
      const match = existing.find(
        (s) => s.firstName.toLowerCase() === firstName.toLowerCase() && s.lastName.toLowerCase() === lastName.toLowerCase() && s.group.toLowerCase() === group.toLowerCase(),
      );
      try {
        if (match) {
          if (rawCode && job.albumType === "personal") match.accessCode = this.codeFor(job, rawCode, match.id);
          result.updated++;
        } else {
          const subject: Subject = {
            id: newId("sub"),
            jobId: job.id,
            firstName,
            lastName,
            group,
            accessCode: this.codeFor(job, rawCode || undefined),
            referencePhotoUrl: null,
            matchedPhotoCount: 0,
            purchased: false,
          };
          this.repo.subjects.insert(subject);
          existing.push(subject);
          result.imported++;
        }
      } catch (err) {
        result.errors.push({ row, message: (err as Error).message });
      }
    });
    return result;
  }

  @Post("jobs/:id/subjects/regenerate-codes")
  @HttpCode(200)
  regenerateCodes(@Req() req: Request, @Param("id") jobId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const { subjectIds } = parse(z.object({ subjectIds: z.array(id).optional() }), body);
    const subjects = this.repo.subjects.filter((s) => s.jobId === job.id);
    if (job.albumType !== "personal") {
      job.sharedAccessCode = this.freshCode();
      for (const s of subjects) s.accessCode = job.sharedAccessCode;
      return subjects.map((s) => this.views.subject(s));
    }
    const targets = subjectIds ? subjects.filter((s) => subjectIds.includes(s.id)) : subjects;
    for (const s of targets) s.accessCode = this.freshCode();
    return targets.map((s) => this.views.subject(s));
  }

  // --- Helpers ------------------------------------------------------------------------

  private codeTaken(code: string, exceptSubjectId?: string): boolean {
    return (
      !!this.repo.jobs.find((j) => j.sharedAccessCode === code) ||
      !!this.repo.subjects.find((s) => s.accessCode === code && s.id !== exceptSubjectId)
    );
  }

  private freshCode(): string {
    let code = generateCode();
    while (this.codeTaken(code)) code = generateCode();
    return code;
  }

  /** Personal albums get a unique code per subject; Team/Open subjects share the job's code. */
  private codeFor(job: Job, requested?: string, exceptSubjectId?: string): string {
    if (job.albumType !== "personal") return job.sharedAccessCode ?? this.freshCode();
    if (!requested) return this.freshCode();
    const code = normalizeCode(requested);
    if (code.length < 4 || code.length > 12) throw badRequest("invalid_code", err().jobs.codeFormat(requested));
    if (this.codeTaken(code, exceptSubjectId)) throw conflict("code_taken", err().jobs.codeTaken(code));
    return code;
  }

  render(text: string, job: Job, studio: Studio): string {
    const vars: Record<string, string> = {
      child: "Ava",
      studio: studio.name,
      job: job.name,
      album_link: `${config.storeUrl}/a/${job.sharedAccessCode ?? "SAMPLE"}`,
      deadline: job.deadline ? fmt().date(job.deadline, { month: "short", day: "numeric" }) : notices().deadlineFallback,
      order_number: "SB-10000",
      tracking_link: "https://tools.usps.com/go/TrackConfirmAction",
      pass_link: `${config.storeUrl}/pass/${job.id}`,
      amount: fmt().money(5000),
    };
    return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
  }

  private createDefaultMessages(job: Job): void {
    // Starting texts in the language of the staff member creating the job; they become studio content.
    const t = notices().defaultSchedule;
    const kinds: Array<[ScheduledMessage["kind"], ScheduledMessage["channel"], string, string]> = [
      ["publish", "both", ...t.publish],
      ["reminder", "both", ...t.reminder],
      ["deadline", "sms", ...t.deadline],
      ["last_chance", "sms", ...t.last_chance],
      ["shipped", "sms", ...t.shipped],
    ];
    for (const [kind, channel, subject, body] of kinds) {
      this.repo.scheduledMessages.insert({ id: newId("sm"), jobId: job.id, kind, channel, sendAt: null, subject, body, enabled: true, sentCount: 0 });
    }
    this.reschedule(job);
  }

  /** Recomputes send times for messages that haven't gone out yet. */
  private reschedule(job: Job): void {
    const deadline = job.deadline ? Date.parse(job.deadline) : null;
    const at: Partial<Record<ScheduledMessage["kind"], string | null>> = {
      publish: job.publishAt,
      reminder: deadline ? new Date(deadline - 5 * DAY_MS).toISOString() : null,
      deadline: deadline ? new Date(deadline - DAY_MS).toISOString() : null,
      last_chance: deadline ? new Date(deadline - 6 * 3_600_000).toISOString() : null,
    };
    for (const m of this.repo.scheduledMessages.filter((x) => x.jobId === job.id && x.sentCount === 0)) {
      if (m.kind in at) m.sendAt = at[m.kind] ?? null;
    }
  }

  /** "Photos are ready" to every parent already linked to this job (opt-in respected by the messaging service). */
  private announce(job: Job, studio: Studio): void {
    const subjectIds = new Set(this.repo.subjects.filter((s) => s.jobId === job.id).map((s) => s.id));
    const parentIds = unique([
      ...this.repo.parentSubjects.filter((ps) => subjectIds.has(ps.subjectId)).map((ps) => ps.parentId),
      ...this.repo.albumAccess.filter((a) => a.jobId === job.id).map((a) => a.parentId),
    ]);
    const template = this.repo.scheduledMessages.find((m) => m.jobId === job.id && m.kind === "publish");
    for (const parentId of parentIds) {
      const parent = this.repo.parents.get(parentId);
      if (!parent || !parent.notifications.galleryReady) continue;
      const channel = parent.notifications.channel === "sms" && parent.phone ? "sms" : "email";
      const to = channel === "sms" ? parent.phone : parent.email;
      if (!to) continue;
      this.messaging.send({
        studioId: studio.id,
        channel,
        to,
        template: "gallery_published",
        subject: notices(parent.locale).gallery.subject(job.name),
        body: this.render(template?.body ?? notices(parent.locale).gallery.defaultBody, job, studio),
        jobId: job.id,
        parentId,
        kind: "automated",
      });
    }
    if (template) template.sentCount += parentIds.length;

    // "Notify me" requests left on the album page before it was published, in the language they were made in.
    const codes = new Set([job.sharedAccessCode, ...this.repo.subjects.filter((s) => s.jobId === job.id).map((s) => s.accessCode)].filter(Boolean));
    for (const request of this.repo.notifyRequests.filter((n) => codes.has(n.albumCode))) {
      const t = notices(request.locale);
      const email = request.destination.includes("@");
      this.messaging.send({
        studioId: studio.id,
        channel: email ? "email" : "sms",
        to: request.destination,
        template: "notify_me",
        subject: t.notifyMe.subject(job.name),
        body: t.notifyMe.body(studio.name, job.name, `${config.storeUrl}/a/${request.albumCode}`),
        jobId: job.id,
        kind: "transactional",
      });
      this.repo.notifyRequests.remove(request.id);
    }
  }
}
