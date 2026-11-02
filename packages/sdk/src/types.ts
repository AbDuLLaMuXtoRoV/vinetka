import type { Locale } from "./i18n";

/**
 * Domain types shared by the API, the worker and every web app.
 * All money is integer cents. All dates are ISO-8601 strings.
 */

export type ID = string;
export type ISODate = string;
export type Cents = number;

// ---------------------------------------------------------------------------
// Studio side
// ---------------------------------------------------------------------------

export type Market = "schools" | "sports" | "dance" | "preschool" | "seniors" | "events";
export const MARKETS: Market[] = ["schools", "sports", "dance", "preschool", "seniors", "events"];

export type AlbumType = "personal" | "team" | "open";
export type JobStatus = "draft" | "live" | "closed";
export type Role = "owner" | "admin" | "photographer";

export type OnboardingStep = "studio" | "brand" | "markets" | "stripe" | "lab" | "price_sheet";
export const ONBOARDING_STEPS: OnboardingStep[] = [
  "studio",
  "brand",
  "markets",
  "stripe",
  "lab",
  "price_sheet",
];

export type StripeStatus = "not_connected" | "pending" | "active" | "restricted";

export interface Studio {
  id: ID;
  name: string;
  slug: string;
  logoUrl: string | null;
  /** Hex color; overrides the accent token in the Family Store. */
  brandColor: string;
  markets: Market[];
  /** Custom album domain, e.g. photos.brightside.photo. */
  albumDomain: string | null;
  defaultLabId: ID | null;
  stripe: {
    status: StripeStatus;
    accountId: string | null;
    payoutSchedule: "daily" | "weekly" | "monthly";
    requirementsDue: string[];
  };
  taxInfo: { legalName: string; ein: string | null; address: Address | null };
  onboarding: { completed: OnboardingStep[]; done: boolean };
  /** Orders at or above this amount get the "Big order" badge on Home. */
  bigOrderThresholdCents: Cents;
  /** Year-to-date sales; drives the 8% / 6% platform fee tier. */
  ytdSalesCents: Cents;
  createdAt: ISODate;
}

export interface StudioBranding {
  name: string;
  logoUrl: string | null;
  brandColor: string;
}

export interface Member {
  id: ID;
  studioId: ID;
  name: string;
  email: string;
  role: Role;
  status: "active" | "invited";
  twoFactorEnabled: boolean;
}

export type OrganizationType = "school" | "league" | "dance_studio" | "preschool" | "client";

export interface Organization {
  id: ID;
  studioId: ID;
  name: string;
  type: OrganizationType;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  address: Address | null;
  jobCount: number;
  lifetimeSalesCents: Cents;
}

export interface PhotoProtection {
  watermark: boolean;
  /** Info overlay with the parent's name over previews. */
  identityOverlay: boolean;
  blurOnFocusLoss: boolean;
  blockDownload: boolean;
}

export interface Job {
  id: ID;
  studioId: ID;
  organizationId: ID;
  organizationName: string;
  name: string;
  market: Market;
  /** Picture day. */
  date: ISODate;
  albumType: AlbumType;
  status: JobStatus;
  priceSheetId: ID;
  shipping: { home: boolean; schoolPickup: boolean };
  /** Team and Open albums share one access code; Personal albums use one code per subject. */
  sharedAccessCode: string | null;
  publishAt: ISODate | null;
  deadline: ISODate | null;
  expiresAt: ISODate | null;
  protection: PhotoProtection;
  downloads: { allowDigital: boolean; allowDownloadAll: boolean };
  createdAt: ISODate;
}

export interface JobStats {
  subjects: number;
  photos: number;
  matchedPct: number;
  unmatchedPhotos: number;
  reviewMatches: number;
  viewers: number;
  buyers: number;
  orders: number;
  salesCents: Cents;
}

export interface JobSummary extends Job {
  stats: JobStats;
}

export interface PublishChecklistItem {
  key: "roster" | "photos" | "matching" | "price_sheet" | "stripe" | "deadline";
  label: string;
  done: boolean;
  href: string;
}

export interface JobDetail extends JobSummary {
  checklist: PublishChecklistItem[];
}

export interface Subject {
  id: ID;
  jobId: ID;
  firstName: string;
  lastName: string;
  /** Grade, class or team. */
  group: string;
  accessCode: string;
  referencePhotoUrl: string | null;
  matchedPhotoCount: number;
  purchased: boolean;
}

export type PhotoStatus = "uploading" | "processing" | "ready" | "failed";

export interface Photo {
  id: ID;
  jobId: ID;
  filename: string;
  width: number;
  height: number;
  status: PhotoStatus;
  /** Pose or shot labels, e.g. "Classic", "Fun". */
  tags: string[];
  /** Group label for group photos, e.g. "Room 12". */
  group: string | null;
  /** Labels for exports, e.g. "Yearbook", "ID card". */
  labels: string[];
  subjectIds: ID[];
  /** Watermarked, signed, expiring preview URLs. Originals are never exposed. */
  thumbUrl: string;
  previewUrl: string;
  duplicateOfId: ID | null;
  uploadedAt: ISODate;
}

export type MatchStatus = "auto" | "review" | "accepted" | "rejected";

export interface Match {
  id: ID;
  jobId: ID;
  photoId: ID;
  subjectId: ID;
  /** 0..1; below the job threshold a match needs review and is never shown to parents. */
  confidence: number;
  status: MatchStatus;
}

export interface MatchWithPhoto extends Match {
  photo: Photo;
}

export interface MatchQueue {
  jobId: ID;
  autoThreshold: number;
  groups: Array<{
    subject: Subject;
    auto: MatchWithPhoto[];
    review: MatchWithPhoto[];
    accepted: MatchWithPhoto[];
  }>;
  unmatched: Photo[];
}

// ---------------------------------------------------------------------------
// Products and pricing
// ---------------------------------------------------------------------------

export interface Lab {
  id: ID;
  name: string;
  region: string;
  turnaroundDays: number;
}

export type ProductCategory = "print" | "digital" | "keepsake" | "group";

export interface LabProduct {
  id: ID;
  labId: ID;
  sku: string;
  name: string;
  category: ProductCategory;
  /** Width / height, used to lock the crop. */
  aspectRatio: number;
  labCostCents: Cents;
  /** Number of photo slots; 1 for a plain print. */
  slots: number;
  customizable: boolean;
  /** Minimum source pixels on the long edge before a low-resolution warning. */
  minLongEdgePx: number;
}

export interface PriceSheetItem {
  id: ID;
  labProductId: ID;
  sku: string;
  name: string;
  category: ProductCategory;
  aspectRatio: number;
  slots: number;
  customizable: boolean;
  minLongEdgePx: number;
  labCostCents: Cents;
  priceCents: Cents;
  enabled: boolean;
  soldOut: boolean;
}

export interface PackageLine {
  itemId: ID;
  quantity: number;
}

export interface Package {
  id: ID;
  name: string;
  description: string;
  priceCents: Cents;
  lines: PackageLine[];
  featured: boolean;
  enabled: boolean;
}

export interface PriceSheet {
  id: ID;
  studioId: ID;
  name: string;
  labId: ID;
  labName: string;
  archived: boolean;
  items: PriceSheetItem[];
  packages: Package[];
  jobsUsing: number;
  updatedAt: ISODate;
}

export type PriceSheetSummary = Omit<PriceSheet, "items" | "packages"> & { productCount: number };

export type PromoKind = "percent" | "fixed" | "free_shipping";

export interface Promo {
  id: ID;
  studioId: ID;
  code: string;
  kind: PromoKind;
  /** Basis points for "percent" (1000 = 10%), cents for "fixed", ignored for free shipping. */
  value: number;
  minSubtotalCents: Cents;
  startsAt: ISODate | null;
  endsAt: ISODate | null;
  /** Empty means every job. */
  jobIds: ID[];
  usageCount: number;
  usageLimit: number | null;
  active: boolean;
}

export interface PassOffer {
  id: ID;
  studioId: ID;
  jobId: ID;
  jobName: string;
  /** What the parent can pay up front. */
  amountsCents: Cents[];
  /** Extra credit as basis points of the amount paid (1000 = pay $50, get $55). */
  bonusBps: number;
  endsAt: ISODate;
  active: boolean;
  soldCount: number;
}

export interface Pass {
  id: ID;
  jobId: ID;
  parentId: ID;
  studioId: ID;
  amountPaidCents: Cents;
  creditCents: Cents;
  remainingCents: Cents;
  createdAt: ISODate;
}

// ---------------------------------------------------------------------------
// Family Store
// ---------------------------------------------------------------------------

export interface ParentConsent {
  smsUpdates: boolean;
  marketing: boolean;
  /** Set when the parent agreed to a selfie search. */
  biometricsAt: ISODate | null;
}

export interface Parent {
  id: ID;
  name: string | null;
  email: string | null;
  phone: string | null;
  /** Language for texts and emails; updated from the parent's latest Accept-Language. */
  locale: Locale;
  consent: ParentConsent;
  notifications: { orderUpdates: boolean; galleryReady: boolean; deadlineReminders: boolean; channel: "sms" | "email" };
  /** When the account was created (shop sign-up, first album visit or first checkout). */
  createdAt: ISODate;
}

export interface AlbumPhoto {
  id: ID;
  thumbUrl: string;
  previewUrl: string;
  width: number;
  height: number;
  tags: string[];
  group: string | null;
}

export interface Album {
  code: string;
  studio: StudioBranding;
  job: {
    id: ID;
    name: string;
    organizationName: string;
    date: ISODate;
    albumType: AlbumType;
    deadline: ISODate | null;
    protection: PhotoProtection;
    shipping: Job["shipping"];
    downloads: Job["downloads"];
  };
  /** Present for Personal albums and once a Team/Open album has been personalised. */
  subject: Pick<Subject, "id" | "firstName" | "lastName" | "group"> | null;
  /** "matching" while photos are still being processed: show the empty state. */
  state: "live" | "matching";
  photos: AlbumPhoto[];
  filters: { tags: string[]; groups: string[] };
  favorites: ID[];
  passCreditCents: Cents;
  findMeAvailable: boolean;
}

/** Returned with HTTP 404/409/410 from GET /albums/:code. */
export interface AlbumAccessError {
  error: "invalid_code" | "not_published" | "expired";
  message: string;
  studio: StudioBranding | null;
  publishAt: ISODate | null;
}

export interface ShopProduct {
  id: ID;
  name: string;
  category: ProductCategory;
  priceCents: Cents;
  aspectRatio: number;
  slots: number;
  customizable: boolean;
  minLongEdgePx: number;
}

export interface ShopPackage {
  id: ID;
  name: string;
  description: string;
  priceCents: Cents;
  /** Human-readable contents, e.g. "2 × 5×7 prints". */
  contents: string[];
  /** Price of the contents bought separately minus the package price. */
  savingsCents: Cents;
  featured: boolean;
  slots: number;
}

export interface Shop {
  albumCode: string;
  packages: ShopPackage[];
  products: ShopProduct[];
  /** Prefilled from favorites; null when the parent has none. */
  suggestedBundle: { packageId: ID; photoIds: ID[] } | null;
  shippingOptions: Array<{ method: DeliveryMethod; label: string; priceCents: Cents }>;
}

export interface Customization {
  /** Normalised crop rectangle (0..1), locked to the product aspect ratio. */
  crop: { x: number; y: number; width: number; height: number } | null;
  background: string | null;
  theme: string | null;
  nameText: string | null;
  retouch: boolean;
}

export interface CartItem {
  id: ID;
  kind: "product" | "package";
  /** PriceSheetItem id or Package id. */
  refId: ID;
  name: string;
  quantity: number;
  unitPriceCents: Cents;
  albumCode: string;
  subjectId: ID | null;
  /** Used to group the cart by child. */
  subjectName: string;
  /** One photo per slot. */
  photoIds: ID[];
  customization: Customization | null;
}

export interface CartTotals {
  subtotalCents: Cents;
  discountCents: Cents;
  shippingCents: Cents;
  /** Estimate in the cart, final at checkout. */
  taxCents: Cents;
  totalCents: Cents;
  passCreditCents: Cents;
  /** What the card is charged: total minus Pass credit. */
  chargedCents: Cents;
}

export interface Cart {
  id: ID;
  studioId: ID;
  items: CartItem[];
  promoCode: string | null;
  promoError: string | null;
  deliveryMethod: DeliveryMethod;
  totals: CartTotals;
}

export type DeliveryMethod = "home" | "school_pickup";
export type PaymentMethodKind = "card" | "apple_pay" | "google_pay";

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Contact {
  name: string;
  email: string;
  phone: string | null;
}

export interface CheckoutInput {
  cartId: ID;
  contact: Contact;
  delivery: { method: DeliveryMethod; address: Address | null };
  payment: {
    method: PaymentMethodKind;
    /** Stripe PaymentMethod id; omitted in dev, where payment is simulated. */
    paymentMethodId: string | null;
  };
}

export interface CheckoutResult {
  orderId: ID;
  status: "paid" | "requires_action";
  /** Present when 3-D Secure needs confirming in the browser. */
  clientSecret: string | null;
}

export type OrderStatus =
  | "paid"
  | "at_lab"
  | "shipped"
  | "delivered"
  | "refunded"
  | "partially_refunded";

export interface OrderItem extends CartItem {
  lineTotalCents: Cents;
  labCostCents: Cents;
}

/** Every cent of the charge accounted for. totalCents = tax + labCost + platformFee + cardFee + studioPayout. */
export interface OrderSplit {
  subtotalCents: Cents;
  discountCents: Cents;
  shippingCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
  passCreditCents: Cents;
  chargedCents: Cents;
  labCostCents: Cents;
  platformFeeBps: number;
  platformFeeCents: Cents;
  cardFeeCents: Cents;
  studioPayoutCents: Cents;
}

export interface Refund {
  id: ID;
  amountCents: Cents;
  reason: string;
  createdAt: ISODate;
}

export interface Reprint {
  id: ID;
  itemIds: ID[];
  reason: string;
  status: "requested" | "submitted" | "shipped";
  createdAt: ISODate;
}

export type MessageChannel = "sms" | "email";

export interface MessageLog {
  id: ID;
  studioId: ID | null;
  channel: MessageChannel;
  to: string;
  template: string;
  body: string;
  status: "queued" | "sent" | "delivered" | "failed" | "suppressed";
  jobId: ID | null;
  orderId: ID | null;
  createdAt: ISODate;
}

export interface Order {
  id: ID;
  number: string;
  studioId: ID;
  studioName: string;
  jobId: ID;
  jobName: string;
  parentId: ID;
  contact: Contact;
  delivery: { method: DeliveryMethod; address: Address | null };
  items: OrderItem[];
  split: OrderSplit;
  status: OrderStatus;
  timeline: Array<{ status: "paid" | "at_lab" | "shipped" | "delivered"; at: ISODate | null }>;
  tracking: { carrier: string; number: string; url: string } | null;
  downloads: Array<{ name: string; url: string }>;
  refunds: Refund[];
  reprints: Reprint[];
  messages: MessageLog[];
  createdAt: ISODate;
}

export interface OrderSummary {
  id: ID;
  number: string;
  jobId: ID;
  jobName: string;
  customerName: string;
  /** Child names on the order, for search. */
  subjectNames: string[];
  totalCents: Cents;
  itemCount: number;
  status: OrderStatus;
  createdAt: ISODate;
}

export interface AccountSummary {
  parent: Parent;
  children: Array<{
    subjectId: ID;
    name: string;
    studioName: string;
    jobName: string;
    year: number;
    albumCode: string;
  }>;
  orders: OrderSummary[];
  passes: Pass[];
}

// ---------------------------------------------------------------------------
// Studio operations
// ---------------------------------------------------------------------------

export type ScheduledMessageKind = "publish" | "reminder" | "deadline" | "last_chance" | "shipped" | "pass_offer";

export interface ScheduledMessage {
  id: ID;
  jobId: ID;
  kind: ScheduledMessageKind;
  channel: MessageChannel | "both";
  /** When it goes out; null for event-driven messages such as "shipped". */
  sendAt: ISODate | null;
  subject: string;
  body: string;
  enabled: boolean;
  sentCount: number;
}

export type ExportType = "subjects_csv" | "yearbook" | "images_by_label";

export interface ExportJob {
  id: ID;
  jobId: ID;
  type: ExportType;
  label: string | null;
  status: "queued" | "running" | "ready" | "failed";
  url: string | null;
  createdAt: ISODate;
}

export interface HomeSummary {
  salesTodayCents: Cents;
  salesWeekCents: Cents;
  ordersToday: number;
  ordersWeek: number;
  openJobs: JobSummary[];
  todos: Array<{ kind: "unmatched" | "review" | "unpublished" | "stripe" | "deadline"; label: string; href: string; count: number }>;
  recentOrders: Array<OrderSummary & { big: boolean }>;
}

export interface Report {
  from: ISODate;
  to: ISODate;
  totals: {
    salesCents: Cents;
    orders: number;
    aovCents: Cents;
    platformFeesCents: Cents;
    cardFeesCents: Cents;
    labCostCents: Cents;
    taxCents: Cents;
    payoutCents: Cents;
  };
  byJob: Array<{ jobId: ID; jobName: string; orders: number; salesCents: Cents; aovCents: Cents }>;
  byDay: Array<{ date: ISODate; orders: number; salesCents: Cents }>;
  payouts: Array<{ id: ID; amountCents: Cents; arrivalDate: ISODate; status: "paid" | "in_transit" | "pending" }>;
}

export interface UploadTicket {
  uploadId: ID;
  filename: string;
  /** Presigned PUT URL (S3/R2 in production, the API itself in dev). */
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  /** Multipart part size for resumable uploads of large files. */
  partSizeBytes: number;
}

export interface CsvImportResult {
  imported: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface StaffSession {
  token: string;
  member: Member;
  studio: Studio;
}

export interface ParentSession {
  token: string;
  parent: Parent;
}

export interface OtpSendResult {
  destination: string;
  channel: MessageChannel;
  resendAfterSec: number;
  /** Only returned outside production so the flow can be tested without Twilio. */
  devCode: string | null;
}

// ---------------------------------------------------------------------------
// Internal admin
// ---------------------------------------------------------------------------

export interface AdminStudioRow {
  studio: Pick<Studio, "id" | "name" | "slug" | "createdAt" | "markets"> & { stripeStatus: StripeStatus; onboardingDone: boolean };
  ownerName: string;
  ownerEmail: string;
  /** "invited" until the owner opens the setup link and chooses a password. */
  ownerStatus: Member["status"];
  ownerMemberId: ID;
  jobs: number;
  liveJobs: number;
  salesCents: Cents;
  platformFeesCents: Cents;
}

export interface LabSubmission {
  id: ID;
  orderId: ID;
  orderNumber: string;
  studioName: string;
  labId: ID;
  labName: string;
  status: "queued" | "submitted" | "accepted" | "failed" | "shipped";
  attempts: number;
  lastError: string | null;
  updatedAt: ISODate;
}

export interface FeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  /** Empty means all studios. */
  studioIds: ID[];
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Onboarding by Snapbell staff (no self-signup) and contact requests
// ---------------------------------------------------------------------------

/**
 * One-time link a new studio owner or invited team member opens to choose a
 * password (studio app /setup?token=…). Valid for 7 days, single use.
 */
export interface SetupLink {
  url: string;
  expiresAt: ISODate;
}

/** What the /setup page shows before the person chooses a password. */
export interface AccountSetupInfo {
  name: string;
  email: string;
  studioName: string;
  role: Role;
  expiresAt: ISODate;
}

export interface AdminCreateStudioInput {
  studioName: string;
  ownerName: string;
  ownerEmail: string;
  /** E.164; national numbers are Uzbek. */
  ownerPhone?: string | null;
  markets?: Market[];
  /** Marks that contact request as converted. */
  contactRequestId?: ID | null;
}

export interface AdminCreateStudioResult {
  studio: AdminStudioRow;
  owner: Member;
  setupLink: SetupLink;
}

/** partner: a photographer who wants to sell with Snapbell (the /contact page). */
export type ContactRequestKind = "partner" | "contact" | "demo" | "switch" | "data_request";
export type ContactRequestStatus = "new" | "contacted" | "converted" | "archived";

export interface ContactRequestInput {
  kind: ContactRequestKind;
  name: string;
  /** Studio or company name. */
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  message: string;
  /** Extra form fields: market, yearly volume, preferred demo time, request type… */
  details?: Record<string, string>;
  /** Honeypot: must be empty (bots fill every field). */
  website?: string;
}

export interface ContactRequest {
  id: ID;
  kind: ContactRequestKind;
  status: ContactRequestStatus;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  message: string;
  details: Record<string, string>;
  /** Language the visitor wrote in. */
  locale: Locale;
  /** Set when a studio was created from this request. */
  studioId: ID | null;
  /** Internal note from the Snapbell team. */
  note: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ---------------------------------------------------------------------------
// Client lists
// ---------------------------------------------------------------------------

/** Every customer account on the platform (internal admin only). */
export interface AdminClientRow {
  parent: Pick<Parent, "id" | "name" | "email" | "phone" | "locale" | "consent" | "createdAt">;
  orders: number;
  /** Paid minus refunded, all studios. */
  spentCents: Cents;
  /** Studios this client has bought from. */
  studios: Array<{ id: ID; name: string }>;
  /** Children linked to the account (album codes unlocked). */
  children: number;
  lastOrderAt: ISODate | null;
}

/**
 * A parent who has bought from this studio. Studios never see anyone who has
 * not placed a paid order with them.
 */
export interface StudioClientRow {
  id: ID;
  name: string | null;
  email: string | null;
  phone: string | null;
  /** Children on this studio's orders. */
  children: string[];
  orders: number;
  /** Paid minus refunded, this studio only. */
  spentCents: Cents;
  firstOrderAt: ISODate;
  lastOrderAt: ISODate;
  /** Agreed to receive offers (marketing consent): only then may the studio send promotions. */
  marketingOptIn: boolean;
}
