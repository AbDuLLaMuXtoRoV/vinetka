import { Injectable } from "@nestjs/common";
import { DEMO_CREDENTIALS, createDemoData, type ContactRequest, type ExportJob } from "@snapbell/sdk";
import { hashPassword } from "../common/crypto";
import {
  Repository,
  type AlbumAccessRow,
  type BulkBatchRow,
  type CartRow,
  type MemberRow,
  type NotifyRequestRow,
  type OneTimeTokenRow,
  type OrderRow,
  type OtpRow,
  type ParentRow,
  type ParentSubjectRow,
  type PhotoRow,
  type PhotoSetRow,
  type SetupTokenRow,
  type ParentHandoffRow,
  type SuppressionRow,
  type Table,
  type UploadRow,
} from "./repository";

class MemoryTable<T> implements Table<T> {
  private readonly rows = new Map<string, T>();

  constructor(private readonly keyOf: (row: T) => string, seed: T[] = []) {
    for (const row of seed) this.rows.set(keyOf(row), row);
  }

  all(): T[] {
    return [...this.rows.values()];
  }
  get(id: string): T | undefined {
    return this.rows.get(id);
  }
  find(predicate: (row: T) => boolean): T | undefined {
    for (const row of this.rows.values()) if (predicate(row)) return row;
    return undefined;
  }
  filter(predicate: (row: T) => boolean): T[] {
    return this.all().filter(predicate);
  }
  insert(row: T): T {
    this.rows.set(this.keyOf(row), row);
    return row;
  }
  update(id: string, patch: Partial<T>): T {
    const row = this.rows.get(id);
    if (!row) throw new Error(`Row ${id} not found`);
    Object.assign(row as object, patch);
    return row;
  }
  remove(id: string): boolean {
    return this.rows.delete(id);
  }
  get size(): number {
    return this.rows.size;
  }
}

const byId = <T extends { id: string }>(seed: T[] = []) => new MemoryTable<T>((r) => r.id, seed);

function buildSeed() {
  const data = createDemoData();
  const passwords = new Map<string, string>(
    [DEMO_CREDENTIALS.owner, DEMO_CREDENTIALS.admin, DEMO_CREDENTIALS.photographer].map((c) => [c.email, hashPassword(c.password)]),
  );
  // Owners of the other demo studios share the dev password.
  const devPassword = hashPassword(DEMO_CREDENTIALS.owner.password);
  const members: MemberRow[] = data.members.map((m) => ({
    ...m,
    passwordHash: m.status === "invited" ? null : (passwords.get(m.email) ?? devPassword),
  }));

  const orders: OrderRow[] = data.orders.map((o) => ({
    ...o,
    paymentState: "paid",
    paymentIntentId: null,
    promoId: null,
    cartId: null,
    bulkBatchId: null,
  }));
  // One collecting bulk batch per school-pickup job, holding its school-pickup orders.
  const batches: BulkBatchRow[] = [];
  for (const job of data.jobs.filter((j) => j.shipping.schoolPickup)) {
    const batch: BulkBatchRow = { id: `bb_${job.id.slice(4)}`, jobId: job.id, status: "collecting", releasedAt: null, orderIds: [] };
    for (const o of orders.filter((x) => x.jobId === job.id && x.delivery.method === "school_pickup")) {
      batch.orderIds.push(o.id);
      o.bulkBatchId = batch.id;
    }
    batches.push(batch);
  }

  return {
    data,
    members,
    orders,
    batches,
    photos: data.photos.map(({ thumbUrl: _t, previewUrl: _p, ...p }): PhotoRow => ({ ...p, sha256: null, sizeBytes: null })),
    parents: data.parents.map((p): ParentRow => ({ ...p, deletionRequestedAt: null, exportRequestedAt: null })),
    parentSubjects: data.parentSubjects.map((ps): ParentSubjectRow => ({ id: `${ps.parentId}:${ps.subjectId}`, ...ps, unlockedAt: data.now })),
    adminHash: hashPassword(DEMO_CREDENTIALS.internalAdmin.password),
    contactRequests: demoContactRequests(Date.parse(data.now)),
    orderSeq: Math.max(10_400, ...data.orders.map((o) => Number(o.number.replace(/\D/g, "")) || 0)),
  };
}

/** A few partner and demo requests so the internal admin's Requests screen isn't empty. */
function demoContactRequests(now: number): ContactRequest[] {
  const at = (hoursAgo: number) => new Date(now - hoursAgo * 3_600_000).toISOString();
  const base = { studioId: null, note: null };
  return [
    {
      ...base,
      id: "cr_demo_tashkent",
      kind: "partner",
      status: "new",
      name: "Дилноза Каримова",
      company: "Фотостудия «Ёркин кадр»",
      email: "dilnoza@yorqinkadr.example",
      phone: "+998901112233",
      city: "Ташкент",
      message:
        "Здравствуйте! Мы снимаем школьные портреты и выпускные альбомы в Ташкенте — около 12 школ в год. Хотим, чтобы родители заказывали фото онлайн, а не по бумажным бланкам. Расскажите, пожалуйста, как подключиться?",
      details: { market: "schools", yearlyVolume: "≈ 3000 детей" },
      locale: "ru",
      createdAt: at(20),
      updatedAt: at(20),
    },
    {
      ...base,
      id: "cr_demo_samarkand",
      kind: "partner",
      status: "new",
      name: "Jasur Toʻxtayev",
      company: "Samarqand Sport Foto",
      email: null,
      phone: "+998935556677",
      city: "Samarqand",
      message:
        "Assalomu alaykum! Samarqanddagi bolalar futbol akademiyalarida musobaqa va jamoa suratlarini olaman. Ota-onalarga suratlarni onlayn sotmoqchiman. Qanday ulanish mumkin?",
      details: { market: "sports" },
      locale: "uz",
      createdAt: at(46),
      updatedAt: at(46),
    },
    {
      ...base,
      id: "cr_demo_preschools",
      kind: "demo",
      status: "contacted",
      name: "Nodira Saidova",
      company: "Bright Kids Preschools",
      email: "nodira@brightkids.example",
      phone: "+998977778899",
      city: "Tashkent",
      message: "We run four preschools and would like to see the parent store before our spring photo day.",
      details: { market: "preschool", preferredTime: "Weekdays after 2 pm" },
      locale: "en",
      note: "Called on Monday; demo booked for next week.",
      createdAt: at(98),
      updatedAt: at(70),
    },
  ];
}

/** Process-local store seeded from the shared demo data at boot. Resets on restart. */
@Injectable()
export class MemoryRepository extends Repository {
  private readonly seed = buildSeed();
  private orderSeq = this.seed.orderSeq;

  readonly studios = byId(this.seed.data.studios);
  readonly members = byId(this.seed.members);
  readonly admins = byId([{ id: "adm_1", email: DEMO_CREDENTIALS.internalAdmin.email, passwordHash: this.seed.adminHash }]);
  readonly labs = byId(this.seed.data.labs);
  readonly labProducts = byId(this.seed.data.labProducts);
  readonly priceSheets = byId(this.seed.data.priceSheets);
  readonly organizations = byId(this.seed.data.organizations);
  readonly jobs = byId(this.seed.data.jobs);
  readonly subjects = byId(this.seed.data.subjects);
  readonly photos = byId(this.seed.photos);
  readonly matches = byId(this.seed.data.matches);
  readonly promos = byId(this.seed.data.promos);
  readonly passOffers = byId(this.seed.data.passOffers);
  readonly passes = byId(this.seed.data.passes);
  readonly parents = byId(this.seed.parents);
  readonly parentSubjects = byId(this.seed.parentSubjects);
  readonly albumAccess = byId<AlbumAccessRow>();
  readonly favorites = byId<PhotoSetRow>();
  readonly albumAdditions = byId<PhotoSetRow>();
  readonly carts = byId<CartRow>();
  readonly orders = byId(this.seed.orders);
  readonly messages = byId(this.seed.data.messages);
  readonly scheduledMessages = byId(this.seed.data.scheduledMessages);
  readonly labSubmissions = byId(this.seed.data.labSubmissions);
  readonly flags = new MemoryTable((f: import("@snapbell/sdk").FeatureFlag) => f.key, this.seed.data.flags);
  readonly exports = byId<ExportJob>();
  readonly bulkBatches = byId(this.seed.batches);
  readonly uploads = byId<UploadRow>();
  readonly otps = byId<OtpRow>();
  readonly oneTimeTokens = byId<OneTimeTokenRow>();
  readonly suppressions = byId<SuppressionRow>();
  readonly notifyRequests = byId<NotifyRequestRow>();
  readonly setupTokens = byId<SetupTokenRow>();
  readonly parentHandoffs = byId<ParentHandoffRow>();
  readonly contactRequests = byId(this.seed.contactRequests);

  nextOrderNumber(): string {
    this.orderSeq += 1;
    return `SB-${this.orderSeq}`;
  }
}
