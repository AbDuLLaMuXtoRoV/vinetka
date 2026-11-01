import { Injectable } from "@nestjs/common";
import type {
  Job,
  JobDetail,
  JobStats,
  JobSummary,
  Member,
  Order,
  OrderSummary,
  Organization,
  Parent,
  PassOffer,
  PriceSheet,
  PriceSheetSummary,
  PublishChecklistItem,
  Studio,
  Subject,
} from "@snapbell/sdk";
import { sum, unique } from "../common/util";
import { Repository, type MemberRow, type OrderRow, type ParentRow } from "../store/repository";
import { MediaService } from "./media.service";
import { labels } from "../i18n";

/** Read models: public shapes with every roll-up computed from current data. */
@Injectable()
export class ViewsService {
  constructor(
    private readonly repo: Repository,
    private readonly media: MediaService,
  ) {}

  paidOrders(predicate: (o: OrderRow) => boolean = () => true): OrderRow[] {
    return this.repo.orders.filter((o) => o.paymentState === "paid" && predicate(o));
  }

  /** Sales figure used everywhere: merchandise after discounts (excludes tax and shipping). */
  netSales(o: Order): number {
    return o.split.subtotalCents - o.split.discountCents;
  }

  studio(s: Studio): Studio {
    return s;
  }

  member({ passwordHash: _p, phone: _ph, ...m }: MemberRow): Member {
    return m;
  }

  parent({ deletionRequestedAt: _d, exportRequestedAt: _e, createdAt: _c, ...p }: ParentRow): Parent {
    return p;
  }

  // --- Jobs ---------------------------------------------------------------------

  jobStats(job: Job): JobStats {
    const subjects = this.repo.subjects.filter((s) => s.jobId === job.id);
    const photos = this.repo.photos.filter((p) => p.jobId === job.id);
    const individual = photos.filter((p) => !p.group && !p.duplicateOfId && p.status === "ready");
    const matches = this.repo.matches.filter((m) => m.jobId === job.id);
    const live = new Set(matches.filter((m) => m.status !== "rejected").map((m) => m.photoId));
    const matched = individual.filter((p) => p.subjectIds.length > 0).length;
    const subjectIds = new Set(subjects.map((s) => s.id));
    const viewers = unique([
      ...this.repo.albumAccess.filter((a) => a.jobId === job.id).map((a) => a.parentId),
      ...this.repo.parentSubjects.filter((ps) => subjectIds.has(ps.subjectId)).map((ps) => ps.parentId),
    ]);
    const orders = this.paidOrders((o) => o.jobId === job.id);
    return {
      subjects: subjects.length,
      photos: photos.length,
      matchedPct: individual.length ? Math.round((matched / individual.length) * 100) : 0,
      unmatchedPhotos: individual.filter((p) => !live.has(p.id) && p.subjectIds.length === 0).length,
      reviewMatches: matches.filter((m) => m.status === "review").length,
      viewers: viewers.length,
      buyers: unique(orders.map((o) => o.parentId)).length,
      orders: orders.length,
      salesCents: sum(orders, (o) => this.netSales(o)),
    };
  }

  jobSummary(job: Job): JobSummary {
    const org = this.repo.organizations.get(job.organizationId);
    return { ...job, organizationName: org?.name ?? job.organizationName, stats: this.jobStats(job) };
  }

  checklist(job: Job, stats = this.jobStats(job)): PublishChecklistItem[] {
    const studio = this.repo.studios.get(job.studioId);
    const sheet = this.repo.priceSheets.get(job.priceSheetId);
    const readyPhotos = this.repo.photos.filter((p) => p.jobId === job.id && p.status === "ready").length;
    return [
      {
        key: "roster",
        label: job.albumType === "open" ? labels().checklist.rosterOptional : labels().checklist.roster(stats.subjects),
        done: job.albumType === "open" || stats.subjects > 0,
        href: `/jobs/${job.id}/roster`,
      },
      { key: "photos", label: labels().checklist.photos(readyPhotos), done: readyPhotos > 0, href: `/jobs/${job.id}/photos` },
      {
        key: "matching",
        label: stats.reviewMatches + stats.unmatchedPhotos > 0 ? labels().checklist.matchesPending(stats.reviewMatches, stats.unmatchedPhotos) : labels().checklist.matchesDone,
        done: stats.reviewMatches === 0 && stats.unmatchedPhotos === 0,
        href: `/jobs/${job.id}/matching`,
      },
      {
        key: "price_sheet",
        label: sheet ? labels().checklist.priceSheet(sheet.name) : labels().checklist.choosePriceSheet,
        done: !!sheet && !sheet.archived && sheet.items.some((i) => i.enabled),
        href: sheet ? `/price-sheets/${sheet.id}` : "/price-sheets",
      },
      { key: "stripe", label: labels().checklist.stripe, done: studio?.stripe.status === "active", href: "/settings/payments" },
      { key: "deadline", label: job.deadline ? labels().checklist.deadlineSet : labels().checklist.setDeadline, done: !!job.deadline, href: `/jobs/${job.id}/settings` },
    ];
  }

  jobDetail(job: Job): JobDetail {
    const summary = this.jobSummary(job);
    return { ...summary, checklist: this.checklist(job, summary.stats) };
  }

  /** Checklist items that block publishing (matching and deadline are advisory). */
  publishBlockers(job: Job): PublishChecklistItem[] {
    return this.checklist(job).filter((c) => !c.done && ["roster", "photos", "price_sheet", "stripe"].includes(c.key));
  }

  // --- Roster, organizations, catalog ----------------------------------------------

  subject(s: Subject): Subject {
    const matchedPhotoCount = this.repo.photos.filter((p) => !p.group && p.subjectIds.includes(s.id)).length;
    const purchased = this.paidOrders((o) => o.jobId === s.jobId || o.items.some((i) => i.subjectId === s.id)).some((o) =>
      o.items.some((i) => i.subjectId === s.id),
    );
    return { ...s, matchedPhotoCount, purchased };
  }

  organization(o: Organization): Organization {
    const jobIds = new Set(this.repo.jobs.filter((j) => j.organizationId === o.id).map((j) => j.id));
    return {
      ...o,
      jobCount: jobIds.size,
      lifetimeSalesCents: sum(this.paidOrders((ord) => jobIds.has(ord.jobId)), (ord) => this.netSales(ord)),
    };
  }

  priceSheet(sheet: PriceSheet): PriceSheet {
    return { ...sheet, jobsUsing: this.repo.jobs.filter((j) => j.priceSheetId === sheet.id).length };
  }

  priceSheetSummary(sheet: PriceSheet): PriceSheetSummary {
    const { items, packages: _p, ...rest } = this.priceSheet(sheet);
    return { ...rest, productCount: items.filter((i) => i.enabled).length };
  }

  passOffer(offer: PassOffer): PassOffer {
    const job = this.repo.jobs.get(offer.jobId);
    return { ...offer, jobName: job?.name ?? offer.jobName };
  }

  // --- Orders ---------------------------------------------------------------------

  orderSummary(o: OrderRow): OrderSummary {
    return {
      id: o.id,
      number: o.number,
      jobId: o.jobId,
      jobName: o.jobName,
      customerName: o.contact.name,
      subjectNames: unique(o.items.map((i) => i.subjectName)),
      totalCents: o.split.totalCents,
      itemCount: sum(o.items, (i) => i.quantity),
      status: o.status,
      createdAt: o.createdAt,
    };
  }

  order(o: OrderRow): Order {
    const { paymentState: _s, paymentIntentId: _pi, promoId: _p, cartId: _c, bulkBatchId: _b, ...rest } = o;
    return {
      ...rest,
      downloads: o.paymentState === "paid" ? o.downloads.map((d) => ({ name: d.name, url: this.media.downloadUrl(d.url) })) : [],
      messages: this.repo.messages
        .filter((m) => m.orderId === o.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  }

  byNewest<T extends { createdAt: string }>(rows: T[]): T[] {
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
