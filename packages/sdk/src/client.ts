import type {
  AccountSetupInfo,
  AdminClientRow,
  StudioClientRow,
  AccountSummary,
  AdminCreateStudioInput,
  AdminCreateStudioResult,
  ContactRequest,
  ContactRequestInput,
  ContactRequestKind,
  ContactRequestStatus,
  SetupLink,
  AdminStudioRow,
  Album,
  AlbumAccessError,
  AlbumPhoto,
  ApiErrorBody,
  Cart,
  CartItem,
  CheckoutInput,
  CheckoutResult,
  Contact,
  CsvImportResult,
  DeliveryMethod,
  ExportJob,
  ExportType,
  FeatureFlag,
  HomeSummary,
  ID,
  Job,
  JobDetail,
  JobStatus,
  JobSummary,
  Lab,
  LabProduct,
  LabSubmission,
  Member,
  MessageChannel,
  MessageLog,
  Order,
  OrderStatus,
  OrderSummary,
  Organization,
  OtpSendResult,
  Parent,
  ParentSession,
  Pass,
  PassOffer,
  Photo,
  PriceSheet,
  PriceSheetSummary,
  Promo,
  Report,
  Role,
  ScheduledMessage,
  Shop,
  StaffSession,
  Studio,
  StudioBranding,
  Subject,
  MatchQueue,
  Match,
  UploadTicket,
} from "./types";
import type { Locale } from "./i18n";

export class ApiError extends Error {
  readonly status: number;
  readonly body: (ApiErrorBody & Partial<AlbumAccessError>) | null;

  constructor(status: number, body: ApiError["body"], message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** Machine-readable code, e.g. "invalid_code", "expired", "rate_limited". */
  get code(): string {
    return this.body?.error ?? String(this.status);
  }
}

export interface ClientOptions {
  /** e.g. http://localhost:4000/v1 */
  baseUrl: string;
  /** Bearer token for a staff, parent or admin session. */
  token?: string | null;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
  /** Sent as Accept-Language: the API localizes error messages and parent-facing texts. */
  locale?: Locale;
}

type Query = Record<string, string | number | boolean | null | undefined>;

/**
 * Hosting gateways answer 502/503 while a sleeping or restarting API starts up.
 * Those requests never reached the API, so they are retried (even payments) for
 * up to RETRY_BUDGET_MS before the caller sees an error.
 */
const GATEWAY_STATUSES = new Set([502, 503]);
const RETRY_BUDGET_MS = 50_000;
const retryDelay = (attempt: number) => Math.min(8_000, 1_000 * 2 ** attempt);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isConnectError(err: unknown): boolean {
  const code = (err as { cause?: { code?: string } })?.cause?.code;
  return code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "UND_ERR_CONNECT_TIMEOUT";
}

function unreachableBody(statusCode: number, message: string): ApiError["body"] {
  return { statusCode, error: "unreachable", message } as ApiError["body"];
}

/** Shown when the API can't be reached at all (instead of a raw "Bad Gateway"). */
const UNREACHABLE: Record<Locale, string> = {
  en: "We couldn't reach Snapbell just now. Please try again in a moment.",
  ru: "Не удалось связаться с Snapbell. Попробуйте ещё раз через минуту.",
  uz: "Snapbell bilan bogʻlanib boʻlmadi. Birozdan soʻng qayta urinib koʻring.",
};

/** What the browser sends for a cart line; the API fills in names and prices from the price sheet. */
export type CartItemInput = Pick<
  CartItem,
  "id" | "kind" | "refId" | "quantity" | "albumCode" | "subjectId" | "photoIds" | "customization"
>;

export type JobInput = Pick<
  Job,
  "name" | "organizationId" | "market" | "date" | "albumType" | "priceSheetId" | "shipping"
> &
  Partial<Pick<Job, "publishAt" | "deadline" | "expiresAt" | "protection" | "downloads">>;

export type SubjectInput = Pick<Subject, "firstName" | "lastName" | "group"> & { accessCode?: string };

export type PriceSheetInput = Partial<Pick<PriceSheet, "name" | "labId" | "archived" | "items" | "packages">>;

export type PromoInput = Omit<Promo, "id" | "studioId" | "usageCount">;

export type PassOfferInput = Pick<PassOffer, "jobId" | "amountsCents" | "bonusBps" | "endsAt" | "active">;

export type OrganizationInput = Omit<Organization, "id" | "studioId" | "jobCount" | "lifetimeSalesCents">;

export type StudioPatch = Partial<
  Pick<
    Studio,
    "name" | "logoUrl" | "brandColor" | "markets" | "albumDomain" | "defaultLabId" | "taxInfo" | "bigOrderThresholdCents"
  >
> & { completeOnboardingStep?: Studio["onboarding"]["completed"][number] };

export function createClient(options: ClientOptions) {
  const base = options.baseUrl.replace(/\/$/, "");
  const doFetch = options.fetch ?? fetch;

  async function request<T>(method: string, path: string, init: { body?: unknown; query?: Query } = {}): Promise<T> {
    const url = new URL(base + path);
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
    const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
    if (options.locale) headers["Accept-Language"] = options.locale;
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.token) headers.Authorization = `Bearer ${options.token}`;

    const started = Date.now();
    const unreachable = UNREACHABLE[options.locale ?? "en"];
    for (let attempt = 0; ; attempt++) {
      const canWait = Date.now() - started + retryDelay(attempt) < RETRY_BUDGET_MS;
      let res: Response;
      try {
        res = await doFetch(url, {
          method,
          headers,
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
          cache: "no-store",
        });
      } catch (err) {
        // Connection refused or DNS failure: the request never reached the API.
        if (canWait && (method === "GET" || isConnectError(err))) {
          await sleep(retryDelay(attempt));
          continue;
        }
        throw new ApiError(0, unreachableBody(0, unreachable), unreachable);
      }
      const text = await res.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }
      if (res.ok) return data as T;
      const body = data && typeof data === "object" && "error" in data ? (data as ApiError["body"]) : null;
      // A gateway answering 502/503 (e.g. a free-tier service still waking up) never passed the request on.
      if (!body && GATEWAY_STATUSES.has(res.status) && canWait) {
        await sleep(retryDelay(attempt));
        continue;
      }
      if (!body && res.status >= 500) {
        throw new ApiError(res.status, unreachableBody(res.status, unreachable), unreachable);
      }
      throw new ApiError(res.status, body, body?.message ?? res.statusText);
    }
  }

  const get = <T>(path: string, query?: Query) => request<T>("GET", path, { query });
  const post = <T>(path: string, body: unknown = {}) => request<T>("POST", path, { body });
  const patch = <T>(path: string, body: unknown) => request<T>("PATCH", path, { body });
  const put = <T>(path: string, body: unknown) => request<T>("PUT", path, { body });
  const del = <T>(path: string) => request<T>("DELETE", path);
  const e = encodeURIComponent;

  return {
    auth: {
      /** Studio staff: email + password. */
      login: (body: { email: string; password: string }) => post<StaffSession>("/auth/login", body),
      /** Studios are created by Snapbell staff only; owners and invited staff finish here. */
      setupInfo: (token: string) => get<AccountSetupInfo>(`/auth/setup/${e(token)}`),
      completeSetup: (body: { token: string; password: string }) => post<StaffSession>("/auth/setup", body),
      magicLink: (body: { email: string }) => post<{ sent: true; devLink: string | null }>("/auth/magic-link", body),
      redeemMagicLink: (body: { token: string }) => post<StaffSession>("/auth/magic-link/redeem", body),
      /**
       * Parent signed in on one site (e.g. the main site) moving to another (the shop):
       * a one-time code valid for 60 seconds, exchanged by the target site.
       */
      parentHandoff: () => post<{ code: string; expiresInSec: number }>("/auth/parent-handoff"),
      redeemParentHandoff: (body: { code: string }) => post<ParentSession>("/auth/parent-handoff/redeem", body),
      /** Parents: phone or email one-time code. Rate-limited; resend after 30s. */
      sendOtp: (body: { destination: string; channel: MessageChannel; albumCode?: string }) =>
        post<OtpSendResult>("/auth/otp/send", body),
      /**
       * `name` is saved on the parent account (shop sign-up). `consent` is only
       * changed when sent: omit it on plain sign-in so earlier choices are kept.
       */
      verifyOtp: (body: { destination: string; code: string; consent?: { smsUpdates: boolean; marketing: boolean }; name?: string }) =>
        post<ParentSession>("/auth/otp/verify", body),
      me: () =>
        get<
          | { kind: "staff"; member: Member; studio: Studio }
          | { kind: "parent"; parent: Parent }
          | { kind: "admin"; email: string }
        >("/auth/me"),
    },

    studio: {
      get: () => get<Studio>("/studio"),
      update: (body: StudioPatch) => patch<Studio>("/studio", body),
      home: () => get<HomeSummary>("/studio/home"),
      members: () => get<Member[]>("/studio/members"),
      /** The invitee chooses a password through `setupLink` (also emailed when a provider is configured). */
      invite: (body: { email: string; name: string; role: Role }) => post<{ member: Member; setupLink: SetupLink }>("/studio/members", body),
      /** New link for a member who hasn't finished setup (the old one stops working). */
      memberSetupLink: (id: ID) => post<SetupLink>(`/studio/members/${e(id)}/setup-link`),
      updateMember: (id: ID, body: { role?: Role }) => patch<Member>(`/studio/members/${e(id)}`, body),
      /** Returns the Stripe Connect onboarding URL (in dev: an instant mock connection). */
      connectStripe: () => post<{ url: string; studio: Studio }>("/studio/stripe/connect"),
      /** Parents who have bought from this studio (owners and admins only). */
      clients: (query: { q?: string } = {}) => get<StudioClientRow[]>("/studio/clients", query),
    },

    organizations: {
      list: () => get<Organization[]>("/organizations"),
      get: (id: ID) => get<Organization & { jobs: JobSummary[]; resultsLink: string }>(`/organizations/${e(id)}`),
      create: (body: OrganizationInput) => post<Organization>("/organizations", body),
      update: (id: ID, body: Partial<OrganizationInput>) => patch<Organization>(`/organizations/${e(id)}`, body),
    },

    jobs: {
      list: (query: { status?: JobStatus; q?: string } = {}) => get<JobSummary[]>("/jobs", query),
      get: (id: ID) => get<JobDetail>(`/jobs/${e(id)}`),
      create: (body: JobInput) => post<Job>("/jobs", body),
      update: (id: ID, body: Partial<JobInput>) => patch<Job>(`/jobs/${e(id)}`, body),
      publish: (id: ID) => post<Job>(`/jobs/${e(id)}/publish`),
      close: (id: ID) => post<Job>(`/jobs/${e(id)}/close`),
      extend: (id: ID, body: { deadline: string }) => post<Job>(`/jobs/${e(id)}/extend`, body),
      duplicate: (id: ID) => post<Job>(`/jobs/${e(id)}/duplicate`),
      /** "What parents see" before saving or publishing. */
      preview: (id: ID) => get<Album>(`/jobs/${e(id)}/preview`),
      orders: (id: ID) => get<OrderSummary[]>(`/jobs/${e(id)}/orders`),
      bulkBatches: (id: ID) =>
        get<Array<{ id: ID; orders: number; status: "collecting" | "released" | "shipped"; releasedAt: string | null }>>(
          `/jobs/${e(id)}/bulk-batches`,
        ),
      releaseBulkBatch: (id: ID, batchId: ID) => post<{ ok: true }>(`/jobs/${e(id)}/bulk-batches/${e(batchId)}/release`),
      messages: (id: ID) => get<ScheduledMessage[]>(`/jobs/${e(id)}/messages`),
      updateMessage: (id: ID, messageId: ID, body: Partial<Pick<ScheduledMessage, "sendAt" | "subject" | "body" | "enabled" | "channel">>) =>
        patch<ScheduledMessage>(`/jobs/${e(id)}/messages/${e(messageId)}`, body),
      testMessage: (id: ID, messageId: ID, body: { to: string }) =>
        post<MessageLog>(`/jobs/${e(id)}/messages/${e(messageId)}/test`, body),
      exports: (id: ID) => get<ExportJob[]>(`/jobs/${e(id)}/exports`),
      createExport: (id: ID, body: { type: ExportType; label?: string }) => post<ExportJob>(`/jobs/${e(id)}/exports`, body),
    },

    subjects: {
      list: (jobId: ID) => get<Subject[]>(`/jobs/${e(jobId)}/subjects`),
      create: (jobId: ID, body: SubjectInput) => post<Subject>(`/jobs/${e(jobId)}/subjects`, body),
      update: (id: ID, body: Partial<SubjectInput>) => patch<Subject>(`/subjects/${e(id)}`, body),
      remove: (id: ID) => del<{ ok: true }>(`/subjects/${e(id)}`),
      /** CSV text plus a mapping from our fields to the CSV's column headers. */
      import: (
        jobId: ID,
        body: { csv: string; mapping: { firstName: string; lastName: string; group: string; accessCode?: string } },
      ) => post<CsvImportResult>(`/jobs/${e(jobId)}/subjects/import`, body),
      regenerateCodes: (jobId: ID, body: { subjectIds?: ID[] } = {}) =>
        post<Subject[]>(`/jobs/${e(jobId)}/subjects/regenerate-codes`, body),
    },

    photos: {
      list: (jobId: ID) => get<Photo[]>(`/jobs/${e(jobId)}/photos`),
      presign: (jobId: ID, body: { files: Array<{ name: string; size: number; type: string }> }) =>
        post<UploadTicket[]>(`/jobs/${e(jobId)}/uploads`, body),
      complete: (uploadId: ID, body: { width?: number; height?: number } = {}) =>
        post<Photo>(`/uploads/${e(uploadId)}/complete`, body),
      update: (id: ID, body: Partial<Pick<Photo, "tags" | "group" | "labels">>) => patch<Photo>(`/photos/${e(id)}`, body),
      remove: (id: ID) => del<{ ok: true }>(`/photos/${e(id)}`),
    },

    matches: {
      queue: (jobId: ID) => get<MatchQueue>(`/jobs/${e(jobId)}/matches`),
      accept: (id: ID) => post<Match>(`/matches/${e(id)}/accept`),
      reject: (id: ID) => post<Match>(`/matches/${e(id)}/reject`),
      reassign: (id: ID, body: { subjectId: ID }) => post<Match>(`/matches/${e(id)}/reassign`, body),
      bulkAccept: (body: { matchIds: ID[] }) => post<{ accepted: number }>("/matches/bulk-accept", body),
      /** Move some of a subject's matches to another subject (e.g. twins merged by mistake). */
      split: (body: { matchIds: ID[]; subjectId: ID }) => post<{ moved: number }>("/matches/split", body),
      /** Manually match an unmatched photo. */
      assign: (body: { photoId: ID; subjectId: ID }) => post<Match>("/matches", body),
    },

    priceSheets: {
      list: () => get<PriceSheetSummary[]>("/price-sheets"),
      get: (id: ID) => get<PriceSheet>(`/price-sheets/${e(id)}`),
      create: (body: { name: string; labId: ID }) => post<PriceSheet>("/price-sheets", body),
      update: (id: ID, body: PriceSheetInput) => patch<PriceSheet>(`/price-sheets/${e(id)}`, body),
      duplicate: (id: ID) => post<PriceSheet>(`/price-sheets/${e(id)}/duplicate`),
    },

    labs: {
      list: () => get<Lab[]>("/labs"),
      products: (labId: ID) => get<LabProduct[]>(`/labs/${e(labId)}/products`),
    },

    promos: {
      list: () => get<Promo[]>("/promos"),
      create: (body: PromoInput) => post<Promo>("/promos", body),
      update: (id: ID, body: Partial<PromoInput>) => patch<Promo>(`/promos/${e(id)}`, body),
      passOffers: () => get<PassOffer[]>("/promos/pass-offers"),
      createPassOffer: (body: PassOfferInput) => post<PassOffer>("/promos/pass-offers", body),
      updatePassOffer: (id: ID, body: Partial<PassOfferInput>) => patch<PassOffer>(`/promos/pass-offers/${e(id)}`, body),
    },

    orders: {
      /** Studio: all orders. Parent tokens only see their own. */
      list: (query: { status?: OrderStatus; q?: string; jobId?: ID } = {}) => get<OrderSummary[]>("/orders", query),
      get: (id: ID) => get<Order>(`/orders/${e(id)}`),
      refund: (id: ID, body: { amountCents?: number; reason: string }) => post<Order>(`/orders/${e(id)}/refund`, body),
      reprint: (id: ID, body: { itemIds: ID[]; reason: string }) => post<Order>(`/orders/${e(id)}/reprint`, body),
    },

    reports: {
      get: (query: { from?: string; to?: string; jobId?: ID } = {}) => get<Report>("/reports", query),
      /** CSV text of the same report. */
      csv: (query: { from?: string; to?: string } = {}) => get<{ filename: string; csv: string }>("/reports/csv", query),
    },

    store: {
      /** Throws ApiError with body AlbumAccessError on 404 invalid_code / 409 not_published / 410 expired. */
      album: (code: string) => get<Album>(`/albums/${e(code)}`),
      branding: (code: string) => get<StudioBranding>(`/albums/${e(code)}/branding`),
      notifyMe: (code: string, body: { destination: string }) => post<{ ok: true }>(`/albums/${e(code)}/notify`, body),
      /** Team and Open albums only. The selfie is deleted right after the search. */
      findMe: (code: string, body: { imageBase64: string; consent: true }) =>
        post<{ photos: AlbumPhoto[]; searchedAt: string }>(`/albums/${e(code)}/find-me`, body),
      addPhotos: (code: string, body: { photoIds: ID[] }) => post<Album>(`/albums/${e(code)}/photos`, body),
      setFavorites: (code: string, body: { photoIds: ID[] }) => put<{ favorites: ID[] }>(`/albums/${e(code)}/favorites`, body),
      shop: (code: string) => get<Shop>(`/albums/${e(code)}/shop`),
    },

    carts: {
      create: (body: { albumCode: string }) => post<Cart>("/carts", body),
      get: (id: ID) => get<Cart>(`/carts/${e(id)}`),
      update: (
        id: ID,
        body: { items?: CartItemInput[]; promoCode?: string | null; deliveryMethod?: DeliveryMethod; postalCode?: string },
      ) => patch<Cart>(`/carts/${e(id)}`, body),
    },

    checkout: {
      submit: (body: CheckoutInput) => post<CheckoutResult>("/checkout", body),
      /** After 3-D Secure succeeds in the browser. */
      confirm: (orderId: ID) => post<CheckoutResult>(`/checkout/${e(orderId)}/confirm`),
    },

    passes: {
      offer: (jobId: ID) =>
        get<PassOffer & { studio: StudioBranding; organizationName: string; pictureDay: string }>(`/passes/offers/${e(jobId)}`),
      buy: (body: { offerId: ID; amountCents: number; contact: Contact }) =>
        post<{ pass: Pass; clientSecret: string | null }>("/passes", body),
    },

    account: {
      get: () => get<AccountSummary>("/account"),
      update: (body: Partial<Pick<Parent, "name" | "email" | "phone" | "notifications" | "locale">> & { consent?: Partial<Parent["consent"]> }) =>
        patch<Parent>("/account", body),
      requestExport: () => post<{ requestedAt: string; deliverTo: string }>("/account/data-export"),
      requestDeletion: () => post<{ requestedAt: string; completesBy: string }>("/account/deletion"),
    },

    contact: {
      /** Public: contact page, partner requests, demo/switch/data-request forms. */
      submit: (body: ContactRequestInput) => post<{ id: ID; received: true }>("/contact-requests", body),
    },

    admin: {
      login: (body: { email: string; password: string }) => post<{ token: string; email: string }>("/admin/login", body),
      studios: (query: { q?: string } = {}) => get<AdminStudioRow[]>("/admin/studios", query),
      jobs: (query: { q?: string; status?: JobStatus } = {}) => get<Array<JobSummary & { studioName: string }>>("/admin/jobs", query),
      orders: (query: { q?: string; status?: OrderStatus } = {}) =>
        get<Array<OrderSummary & { studioName: string }>>("/admin/orders", query),
      order: (id: ID) => get<Order>(`/admin/orders/${e(id)}`),
      refund: (id: ID, body: { amountCents?: number; reason: string }) => post<Order>(`/admin/orders/${e(id)}/refund`, body),
      labQueue: (query: { status?: LabSubmission["status"] } = {}) => get<LabSubmission[]>("/admin/lab-queue", query),
      retryLabSubmission: (id: ID) => post<LabSubmission>(`/admin/lab-queue/${e(id)}/retry`),
      messages: (query: { q?: string; channel?: MessageChannel; status?: MessageLog["status"] } = {}) =>
        get<MessageLog[]>("/admin/messages", query),
      /** The only way a studio is created. Returns the owner's one-time setup link to send them. */
      createStudio: (body: AdminCreateStudioInput) => post<AdminCreateStudioResult>("/admin/studios", body),
      memberSetupLink: (memberId: ID) => post<SetupLink>(`/admin/members/${e(memberId)}/setup-link`),
      contactRequests: (query: { status?: ContactRequestStatus; kind?: ContactRequestKind; q?: string } = {}) =>
        get<ContactRequest[]>("/admin/contact-requests", query),
      updateContactRequest: (id: ID, body: { status?: ContactRequestStatus; note?: string | null }) =>
        patch<ContactRequest>(`/admin/contact-requests/${e(id)}`, body),
      /** Every customer account on the platform. */
      clients: (query: { q?: string } = {}) => get<AdminClientRow[]>("/admin/clients", query),
      flags: () => get<FeatureFlag[]>("/admin/flags"),
      updateFlag: (key: string, body: Partial<Pick<FeatureFlag, "enabled" | "studioIds">>) =>
        patch<FeatureFlag>(`/admin/flags/${e(key)}`, body),
    },
  };
}

export type SnapbellClient = ReturnType<typeof createClient>;
