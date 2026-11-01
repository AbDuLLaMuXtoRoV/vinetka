import type {
  Locale,
  CartItemInput,
  ContactRequest,
  DeliveryMethod,
  ExportJob,
  FeatureFlag,
  Job,
  Lab,
  LabProduct,
  LabSubmission,
  Match,
  Member,
  MessageChannel,
  MessageLog,
  Order,
  Organization,
  Parent,
  Pass,
  PassOffer,
  Photo,
  PriceSheet,
  Promo,
  ScheduledMessage,
  Studio,
  Subject,
} from "@snapbell/sdk";

/**
 * Storage boundary. Services only touch data through these tables, so the
 * in-memory implementation (seeded from demo data) can be replaced by one
 * backed by Prisma/PostgreSQL (packages/db/prisma/schema.prisma). The table
 * API is synchronous because the memory store is; a database-backed
 * implementation makes these methods async and the services await them.
 */
export interface Table<T> {
  all(): T[];
  get(id: string): T | undefined;
  find(predicate: (row: T) => boolean): T | undefined;
  filter(predicate: (row: T) => boolean): T[];
  insert(row: T): T;
  update(id: string, patch: Partial<T>): T;
  remove(id: string): boolean;
  readonly size: number;
}

// Rows that carry more than the public domain type.
export interface MemberRow extends Member {
  passwordHash: string | null;
  /** E.164; set for owners created by Snapbell staff. */
  phone?: string | null;
}
export interface AdminRow {
  id: string;
  email: string;
  passwordHash: string;
}
export interface PhotoRow extends Omit<Photo, "thumbUrl" | "previewUrl"> {
  sha256: string | null;
  sizeBytes: number | null;
}
export interface ParentRow extends Parent {
  deletionRequestedAt: string | null;
  exportRequestedAt: string | null;
  createdAt: string;
}
export interface OrderRow extends Order {
  /** "pending" until payment succeeds; pending orders are hidden from lists and reports. */
  paymentState: "pending" | "paid";
  paymentIntentId: string | null;
  promoId: string | null;
  cartId: string | null;
  bulkBatchId: string | null;
}
export interface CartRow {
  id: string;
  studioId: string;
  parentId: string | null;
  items: CartItemInput[];
  promoCode: string | null;
  deliveryMethod: DeliveryMethod;
  postalCode: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface UploadRow {
  id: string;
  jobId: string;
  photoId: string;
  filename: string;
  type: string;
  size: number;
  receivedBytes: number;
  sha256: string | null;
  completedAt: string | null;
  createdAt: string;
}
export interface OtpRow {
  /** The normalised destination. */
  id: string;
  channel: MessageChannel;
  codeHash: string | null;
  attempts: number;
  sentAt: number;
  expiresAt: number;
}
export interface OneTimeTokenRow {
  id: string;
  kind: "magic_link";
  memberId: string;
  expiresAt: number;
}
/**
 * "Choose your password" link for owners created by Snapbell staff and invited
 * team members. Only a hash of the token is stored; single use; a newer link
 * for the same member replaces older ones.
 */
export interface SetupTokenRow {
  /** HMAC of the raw token. */
  id: string;
  memberId: string;
  expiresAt: number;
  usedAt: number | null;
  createdAt: number;
}
export interface ParentSubjectRow {
  id: string;
  parentId: string;
  subjectId: string;
  albumCode: string;
  unlockedAt: string;
}
export interface AlbumAccessRow {
  id: string;
  parentId: string;
  jobId: string;
  albumCode: string;
  firstSeenAt: string;
}
export interface PhotoSetRow {
  /** `${parentId}:${albumCode}` */
  id: string;
  parentId: string;
  albumCode: string;
  photoIds: string[];
}
export interface BulkBatchRow {
  id: string;
  jobId: string;
  status: "collecting" | "released" | "shipped";
  releasedAt: string | null;
  orderIds: string[];
}
export interface SuppressionRow {
  /** The destination (E.164 phone or lowercase email). */
  id: string;
  channel: MessageChannel;
  reason: string;
  createdAt: string;
}
export interface NotifyRequestRow {
  id: string;
  albumCode: string;
  destination: string;
  /** Language the request was made in; the "photos are ready" message uses it. */
  locale: Locale;
  createdAt: string;
}

export abstract class Repository {
  abstract readonly studios: Table<Studio>;
  abstract readonly members: Table<MemberRow>;
  abstract readonly admins: Table<AdminRow>;
  abstract readonly labs: Table<Lab>;
  abstract readonly labProducts: Table<LabProduct>;
  abstract readonly priceSheets: Table<PriceSheet>;
  abstract readonly organizations: Table<Organization>;
  abstract readonly jobs: Table<Job>;
  abstract readonly subjects: Table<Subject>;
  abstract readonly photos: Table<PhotoRow>;
  abstract readonly matches: Table<Match>;
  abstract readonly promos: Table<Promo>;
  abstract readonly passOffers: Table<PassOffer>;
  abstract readonly passes: Table<Pass>;
  abstract readonly parents: Table<ParentRow>;
  abstract readonly parentSubjects: Table<ParentSubjectRow>;
  abstract readonly albumAccess: Table<AlbumAccessRow>;
  abstract readonly favorites: Table<PhotoSetRow>;
  abstract readonly albumAdditions: Table<PhotoSetRow>;
  abstract readonly carts: Table<CartRow>;
  abstract readonly orders: Table<OrderRow>;
  abstract readonly messages: Table<MessageLog>;
  abstract readonly scheduledMessages: Table<ScheduledMessage>;
  abstract readonly labSubmissions: Table<LabSubmission>;
  abstract readonly flags: Table<FeatureFlag>;
  abstract readonly exports: Table<ExportJob>;
  abstract readonly bulkBatches: Table<BulkBatchRow>;
  abstract readonly uploads: Table<UploadRow>;
  abstract readonly otps: Table<OtpRow>;
  abstract readonly oneTimeTokens: Table<OneTimeTokenRow>;
  abstract readonly suppressions: Table<SuppressionRow>;
  abstract readonly notifyRequests: Table<NotifyRequestRow>;
  abstract readonly setupTokens: Table<SetupTokenRow>;
  abstract readonly contactRequests: Table<ContactRequest>;

  /** Next human-readable order number, e.g. "SB-10452". */
  abstract nextOrderNumber(): string;
}
