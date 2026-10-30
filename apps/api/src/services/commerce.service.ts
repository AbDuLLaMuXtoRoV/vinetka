import { Injectable, Logger } from "@nestjs/common";
import {
  RETOUCH_ADDON,
  SHIPPING_CENTS,
  applyPromo,
  bps,
  splitOrder,
  type Cart,
  type CartItem,
  type CartItemInput,
  type CheckoutInput,
  type CheckoutResult,
  type DeliveryMethod,
  type Job,
  type LabSubmission,
  type OrderItem,
  type OrderSplit,
  type PriceSheetItem,
  type Promo,
  type Studio,
  type Locale,
} from "@snapbell/sdk";
import { newId } from "../common/crypto";
import { ApiError, badRequest, conflict, forbidden, notFound } from "../common/errors";
import { nowIso, sum, unique } from "../common/util";
import { Repository, type CartRow, type OrderRow, type ParentRow } from "../store/repository";
import { AlbumsService, type ResolvedAlbum } from "./albums.service";
import { MessagingService } from "./messaging.service";
import { PaymentsService } from "./payments.service";
import { QueueService } from "./queue.service";
import { currentLocale, err as msg, fmt, notices } from "../i18n";

/** Estimated sales tax by state, in basis points. Production uses Stripe Tax/TaxJar. */
const TAX_BPS: Record<string, number> = { CA: 725, NY: 400, TX: 625, WA: 650, FL: 600, IL: 625, OR: 0, MT: 0, NH: 0, DE: 0, AK: 0 };
const DEFAULT_TAX_BPS = 600;

const ZIP_PREFIX_STATE: Array<[number, number, string]> = [
  [100, 149, "NY"], [320, 349, "FL"], [600, 629, "IL"], [750, 799, "TX"], [885, 885, "TX"],
  [900, 961, "CA"], [970, 979, "OR"], [980, 994, "WA"],
];

export function stateForZip(postalCode: string | null | undefined): string | null {
  const prefix = Number(postalCode?.slice(0, 3));
  if (!Number.isFinite(prefix)) return null;
  return ZIP_PREFIX_STATE.find(([lo, hi]) => prefix >= lo && prefix <= hi)?.[2] ?? null;
}

export function taxBpsFor(state: string | null): number {
  return state ? (TAX_BPS[state] ?? DEFAULT_TAX_BPS) : DEFAULT_TAX_BPS;
}

interface PricedLine {
  item: CartItem;
  jobId: string;
  labCostCents: number;
  physical: boolean;
  /** Photo ids delivered as downloads once paid. */
  digitalPhotoIds: string[];
}

interface PricedCart {
  studio: Studio;
  lines: PricedLine[];
  jobs: Job[];
  physical: boolean;
  deliveryMethod: DeliveryMethod;
  allowedMethods: DeliveryMethod[];
  promo: Promo | null;
  promoError: string | null;
  split: OrderSplit;
}

@Injectable()
export class CommerceService {
  private readonly logger = new Logger("Commerce");

  constructor(
    private readonly repo: Repository,
    private readonly albums: AlbumsService,
    private readonly messaging: MessagingService,
    private readonly payments: PaymentsService,
    private readonly queue: QueueService,
  ) {}

  /** Receipts and refund notices go out in the parent's saved language. */
  private localeFor(parentId: string): Locale {
    return this.repo.parents.get(parentId)?.locale ?? currentLocale();
  }

  private noticesFor(parentId: string) {
    return notices(this.localeFor(parentId));
  }

  // --- Pricing (server is the only source of truth) -----------------------------------

  private priceLine(input: CartItemInput, studioId: string, parent: ParentRow | null): PricedLine {
    let r: ResolvedAlbum;
    try {
      r = this.albums.resolve(input.albumCode);
      this.albums.assertOpen(r);
    } catch (err) {
      if (err instanceof ApiError) throw badRequest("album_unavailable", msg().cart.albumUnavailable(input.albumCode, err.message));
      throw err;
    }
    if (r.studio.id !== studioId) {
      throw conflict("different_studio", msg().cart.differentStudio);
    }
    if (parent && !this.albums.hasAccess(r, parent)) throw forbidden(msg().cart.openAlbumFirst);

    const sheet = this.repo.priceSheets.get(r.job.priceSheetId);
    if (!sheet) throw badRequest("item_unavailable", msg().cart.noProducts);
    const itemById = (id: string) => sheet.items.find((i) => i.id === id);
    const allowed = (i: PriceSheetItem | undefined): i is PriceSheetItem =>
      !!i &&
      i.enabled &&
      !i.soldOut &&
      (i.category !== "digital" || (r.job.downloads.allowDigital && (i.slots !== 0 || r.job.downloads.allowDownloadAll)));

    const visible = this.albums.visiblePhotos(r, parent);
    const visibleIds = new Set(visible.map((p) => p.id));
    const photoIds = unique(input.photoIds ?? []);
    const badPhotos = photoIds.filter((id) => !visibleIds.has(id));
    if (badPhotos.length) throw badRequest("invalid_photo", msg().cart.invalidPhotos, { photoIds: badPhotos });

    const quantity = Math.trunc(input.quantity);
    if (!(quantity >= 1 && quantity <= 99)) throw badRequest("invalid_quantity", msg().cart.quantity);
    const retouch = !!input.customization?.retouch;

    let name: string;
    let unit: number;
    let labUnit: number;
    let contents: Array<{ item: PriceSheetItem; quantity: number }>;
    if (input.kind === "product") {
      const item = itemById(input.refId);
      if (!allowed(item)) throw badRequest("item_unavailable", msg().cart.productUnavailable);
      name = item.name;
      unit = item.priceCents;
      labUnit = item.labCostCents;
      contents = [{ item, quantity: 1 }];
    } else {
      const pkg = sheet.packages.find((p) => p.id === input.refId && p.enabled);
      if (!pkg) throw badRequest("item_unavailable", msg().cart.packageUnavailable);
      contents = pkg.lines.map((l) => ({ item: itemById(l.itemId)!, quantity: l.quantity })).filter((c) => !!c.item);
      if (contents.some((c) => !allowed(c.item))) throw badRequest("item_unavailable", msg().cart.packagePartUnavailable);
      name = pkg.name;
      unit = pkg.priceCents;
      labUnit = sum(contents, (c) => c.item.labCostCents * c.quantity);
    }
    const downloadAll = contents.some((c) => c.item.category === "digital" && c.item.slots === 0);
    if (photoIds.length === 0 && !(input.kind === "product" && downloadAll)) {
      throw badRequest("photo_required", msg().cart.photoRequired);
    }
    if (retouch) {
      unit += RETOUCH_ADDON.priceCents;
      labUnit += RETOUCH_ADDON.labCostCents;
    }

    const subject =
      r.subject ?? (input.subjectId ? (this.repo.subjects.find((s) => s.id === input.subjectId && s.jobId === r.job.id) ?? null) : null);
    const customization = input.customization
      ? { ...input.customization, nameText: input.customization.nameText ? input.customization.nameText.slice(0, 40) : null }
      : null;
    const digital = contents.some((c) => c.item.category === "digital");

    return {
      item: {
        id: input.id,
        kind: input.kind,
        refId: input.refId,
        name,
        quantity,
        unitPriceCents: unit,
        albumCode: r.code,
        subjectId: subject?.id ?? null,
        subjectName: subject ? `${subject.firstName} ${subject.lastName}` : r.job.name,
        photoIds,
        customization,
      },
      jobId: r.job.id,
      labCostCents: labUnit * quantity,
      physical: contents.some((c) => c.item.category !== "digital"),
      digitalPhotoIds: digital ? (downloadAll ? visible.map((p) => p.id) : photoIds) : [],
    };
  }

  /** `lenient` drops lines that became unavailable (used when reading a saved cart). */
  price(cart: CartRow, opts: { state?: string | null; lenient?: boolean } = {}): PricedCart {
    const studio = this.repo.studios.get(cart.studioId);
    if (!studio) throw notFound(msg().notFound.studio);
    const parent = cart.parentId ? (this.repo.parents.get(cart.parentId) ?? null) : null;
    const lines: PricedLine[] = [];
    for (const input of cart.items) {
      try {
        lines.push(this.priceLine(input, cart.studioId, parent));
      } catch (err) {
        if (!opts.lenient) throw err;
      }
    }
    const jobs = unique(lines.map((l) => l.jobId)).map((id) => this.repo.jobs.get(id)!);
    const physical = lines.some((l) => l.physical);
    const allowedMethods: DeliveryMethod[] = [];
    if (jobs.every((j) => j.shipping.home)) allowedMethods.push("home");
    if (jobs.length > 0 && jobs.every((j) => j.shipping.schoolPickup)) allowedMethods.push("school_pickup");
    const deliveryMethod = allowedMethods.includes(cart.deliveryMethod) ? cart.deliveryMethod : (allowedMethods[0] ?? "home");

    const subtotal = sum(lines, (l) => l.item.unitPriceCents * l.item.quantity);
    let shipping: number = physical ? SHIPPING_CENTS[deliveryMethod] : 0;
    let discount = 0;
    let promo: Promo | null = null;
    let promoError: string | null = null;
    if (cart.promoCode) {
      promo = this.repo.promos.find((p) => p.studioId === studio.id && p.code === cart.promoCode) ?? null;
      if (!promo) promoError = msg().promo.unknown;
      else {
        const result = applyPromo(promo, { subtotalCents: subtotal, shippingCents: shipping, jobIds: jobs.map((j) => j.id) });
        if (result.error) {
          promoError = result.code === "min_subtotal" ? msg().promo.min_subtotal(fmt().money(promo.minSubtotalCents)) : result.code ? msg().promo[result.code] : result.error;
          promo = null;
        } else {
          discount = result.discountCents;
          shipping = result.shippingCents;
        }
      }
    }
    const state = opts.state ?? stateForZip(cart.postalCode);
    const tax = bps(Math.max(0, subtotal - discount) + shipping, taxBpsFor(state));
    const split = splitOrder({
      subtotalCents: subtotal,
      discountCents: discount,
      shippingCents: shipping,
      taxCents: tax,
      labCostCents: sum(lines, (l) => l.labCostCents),
      passCreditCents: this.albums.passCredit(parent, jobs.map((j) => j.id)),
      ytdSalesCents: studio.ytdSalesCents,
    });
    return { studio, lines, jobs, physical, deliveryMethod, allowedMethods, promo, promoError, split };
  }

  view(cart: CartRow): Cart {
    const priced = this.price(cart, { lenient: true });
    const s = priced.split;
    return {
      id: cart.id,
      studioId: cart.studioId,
      items: priced.lines.map((l) => l.item),
      promoCode: cart.promoCode,
      promoError: priced.promoError,
      deliveryMethod: priced.deliveryMethod,
      totals: {
        subtotalCents: s.subtotalCents,
        discountCents: s.discountCents,
        shippingCents: s.shippingCents,
        taxCents: s.taxCents,
        totalCents: s.totalCents,
        passCreditCents: s.passCreditCents,
        chargedCents: s.chargedCents,
      },
    };
  }

  /** Validates the new items against the price sheet before saving them. */
  updateCart(cart: CartRow, patch: { items?: CartItemInput[]; promoCode?: string | null; deliveryMethod?: DeliveryMethod; postalCode?: string }): Cart {
    const next: CartRow = { ...cart, items: patch.items ?? cart.items };
    if (patch.promoCode !== undefined) next.promoCode = patch.promoCode ? patch.promoCode.trim().toUpperCase() : null;
    if (patch.postalCode !== undefined) next.postalCode = patch.postalCode || null;
    if (patch.deliveryMethod) next.deliveryMethod = patch.deliveryMethod;
    const priced = this.price(next);
    if (patch.deliveryMethod && priced.lines.length > 0 && !priced.allowedMethods.includes(patch.deliveryMethod)) {
      throw badRequest("delivery_unavailable", patch.deliveryMethod === "school_pickup" ? msg().cart.pickupUnavailable : msg().cart.homeUnavailable);
    }
    Object.assign(cart, next, { updatedAt: nowIso() });
    return this.view(cart);
  }

  // --- Checkout ------------------------------------------------------------------------

  async checkout(parent: ParentRow, input: CheckoutInput): Promise<CheckoutResult> {
    const cart = this.repo.carts.get(input.cartId);
    if (!cart) throw notFound(msg().notFound.cart);
    if (cart.parentId && cart.parentId !== parent.id) throw forbidden(msg().cart.notYours);
    cart.parentId = parent.id;
    if (cart.items.length === 0) throw badRequest("empty_cart", msg().cart.empty);

    const address = input.delivery.address;
    const priced = this.price({ ...cart, deliveryMethod: input.delivery.method }, { state: address?.state ?? null });
    if (priced.physical && !priced.allowedMethods.includes(input.delivery.method)) {
      throw badRequest("delivery_unavailable", msg().cart.deliveryUnavailable);
    }
    if (priced.physical && input.delivery.method === "home" && !address) {
      throw badRequest("address_required", msg().cart.addressRequired);
    }
    const studio = priced.studio;
    const split = priced.split;
    const now = nowIso();
    const orderId = newId("ord");
    const number = this.repo.nextOrderNumber();
    const items: OrderItem[] = priced.lines.map((l) => ({
      ...l.item,
      lineTotalCents: l.item.unitPriceCents * l.item.quantity,
      labCostCents: l.labCostCents,
    }));
    const photoNames = new Map(this.repo.photos.filter((p) => priced.jobs.some((j) => j.id === p.jobId)).map((p) => [p.id, p.tags[0] ?? "Photo"]));
    const downloads = unique(priced.lines.flatMap((l) => l.digitalPhotoIds.map((id) => `${l.item.subjectName}|${id}`))).map((key) => {
      const [subjectName, photoId] = key.split("|") as [string, string];
      return { name: `${subjectName} — ${photoNames.get(photoId) ?? "Photo"} (${photoId}).jpg`, url: `/downloads/${orderId}/${photoId}` };
    });
    const firstJob = priced.jobs[0]!;

    const order: OrderRow = {
      id: orderId,
      number,
      studioId: studio.id,
      studioName: studio.name,
      jobId: firstJob.id,
      jobName: priced.jobs.map((j) => j.name).join(" + "),
      parentId: parent.id,
      contact: { name: input.contact.name, email: input.contact.email.toLowerCase(), phone: input.contact.phone },
      delivery: { method: priced.physical ? input.delivery.method : "home", address: priced.physical && input.delivery.method === "home" ? address : null },
      items,
      split,
      status: "paid",
      timeline: [
        { status: "paid", at: null },
        { status: "at_lab", at: null },
        { status: "shipped", at: null },
        { status: "delivered", at: null },
      ],
      tracking: null,
      downloads,
      refunds: [],
      reprints: [],
      messages: [],
      createdAt: now,
      paymentState: "pending",
      paymentIntentId: null,
      promoId: priced.promo?.id ?? null,
      cartId: cart.id,
      bulkBatchId: null,
    };
    this.repo.orders.insert(order);
    if (!parent.name) parent.name = input.contact.name;

    if (split.chargedCents === 0) {
      this.finalizePaid(order);
      return { orderId, status: "paid", clientSecret: null };
    }
    if (this.payments.live && studio.stripe.accountId) {
      const pi = await this.payments.createPaymentIntent({
        amountCents: split.chargedCents,
        applicationFeeCents: split.chargedCents - split.studioPayoutCents,
        destinationAccountId: studio.stripe.accountId,
        orderId,
        orderNumber: number,
        email: order.contact.email,
      });
      order.paymentIntentId = pi.id;
      return { orderId, status: "requires_action", clientSecret: pi.clientSecret };
    }
    // Simulated payments: "+3ds" in the email exercises the 3-D Secure path.
    if (order.contact.email.includes("+3ds")) {
      order.paymentIntentId = `pi_sim_${orderId}`;
      return { orderId, status: "requires_action", clientSecret: `pi_sim_${orderId}_secret_dev` };
    }
    order.paymentIntentId = `pi_sim_${orderId}`;
    this.finalizePaid(order);
    return { orderId, status: "paid", clientSecret: null };
  }

  async confirm(order: OrderRow): Promise<CheckoutResult> {
    if (order.paymentState === "paid") return { orderId: order.id, status: "paid", clientSecret: null };
    if (this.payments.live && order.paymentIntentId && !order.paymentIntentId.startsWith("pi_sim_")) {
      const status = await this.payments.paymentStatus(order.paymentIntentId);
      if (status !== "succeeded" && status !== "processing") {
        return { orderId: order.id, status: "requires_action", clientSecret: null };
      }
    }
    this.finalizePaid(order);
    return { orderId: order.id, status: "paid", clientSecret: null };
  }

  /** Everything that happens once money is in: credits, promo usage, lab, receipts. Idempotent. */
  finalizePaid(order: OrderRow): void {
    if (order.paymentState === "paid") return;
    const now = nowIso();
    order.paymentState = "paid";
    order.status = "paid";
    order.timeline[0] = { status: "paid", at: now };

    let credit = order.split.passCreditCents;
    const jobIds = unique(order.items.map((i) => this.albumJobId(i.albumCode)).filter((j): j is string => !!j));
    for (const pass of this.repo.passes
      .filter((p) => p.parentId === order.parentId && jobIds.includes(p.jobId) && p.remainingCents > 0)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (credit <= 0) break;
      const used = Math.min(credit, pass.remainingCents);
      pass.remainingCents -= used;
      credit -= used;
    }
    if (order.promoId) {
      const promo = this.repo.promos.get(order.promoId);
      if (promo) promo.usageCount += 1;
    }
    const studio = this.repo.studios.get(order.studioId)!;
    studio.ytdSalesCents += order.split.subtotalCents - order.split.discountCents;

    const physical = order.items.some((i) => this.isPhysical(i, order.jobId));
    if (physical) this.queueLab(order);
    else {
      // Digital-only: delivered the moment it's paid.
      order.status = "delivered";
      order.timeline = order.timeline.map((t) => ({ ...t, at: now }));
    }

    const cart = order.cartId ? this.repo.carts.get(order.cartId) : undefined;
    if (cart) Object.assign(cart, { items: [], promoCode: null, updatedAt: now });

    this.messaging.send({
      studioId: order.studioId,
      channel: "email",
      to: order.contact.email,
      template: "order_confirmation",
      subject: this.noticesFor(order.parentId).orderConfirmation.subject(order.number),
      body: this.noticesFor(order.parentId).orderConfirmation.body({
        firstName: order.contact.name.split(" ")[0] ?? order.contact.name,
        studio: studio.name,
        number: order.number,
        total: fmt(this.localeFor(order.parentId)).money(order.split.totalCents),
        downloads: order.downloads.length > 0,
      }),
      orderId: order.id,
      jobId: order.jobId,
      parentId: order.parentId,
      kind: "transactional",
    });
  }

  private albumJobId(code: string): string | null {
    try {
      return this.albums.resolve(code).job.id;
    } catch {
      return null;
    }
  }

  private isPhysical(item: OrderItem, fallbackJobId: string): boolean {
    const jobId = this.albumJobId(item.albumCode) ?? fallbackJobId;
    const sheet = this.repo.priceSheets.get(this.repo.jobs.get(jobId)?.priceSheetId ?? "");
    if (!sheet) return true;
    const ids = item.kind === "package" ? (sheet.packages.find((p) => p.id === item.refId)?.lines.map((l) => l.itemId) ?? []) : [item.refId];
    return ids.some((id) => sheet.items.find((i) => i.id === id)?.category !== "digital");
  }

  /** Home orders go straight to the lab; school-pickup orders wait in the job's bulk batch. */
  private queueLab(order: OrderRow): void {
    const sheet = this.repo.priceSheets.get(this.repo.jobs.get(order.jobId)?.priceSheetId ?? "");
    const lab = this.repo.labs.get(sheet?.labId ?? "");
    const pickup = order.delivery.method === "school_pickup";
    const submission: LabSubmission = {
      id: newId("lab"),
      orderId: order.id,
      orderNumber: order.number,
      studioName: order.studioName,
      labId: lab?.id ?? "lab_unknown",
      labName: lab?.name ?? "Lab",
      status: pickup ? "queued" : "submitted",
      attempts: pickup ? 0 : 1,
      lastError: null,
      updatedAt: nowIso(),
    };
    this.repo.labSubmissions.insert(submission);
    if (pickup) {
      let batch = this.repo.bulkBatches.find((b) => b.jobId === order.jobId && b.status === "collecting");
      if (!batch) batch = this.repo.bulkBatches.insert({ id: newId("bb"), jobId: order.jobId, status: "collecting", releasedAt: null, orderIds: [] });
      batch.orderIds.push(order.id);
      order.bulkBatchId = batch.id;
    } else {
      void this.queue.enqueue("labs", { submissionId: submission.id, orderId: order.id, labId: submission.labId });
    }
  }

  // --- After the sale ---------------------------------------------------------------------

  async refund(order: OrderRow, input: { amountCents?: number; reason: string }): Promise<OrderRow> {
    if (order.paymentState !== "paid") throw conflict("not_paid", msg().orders.notPaid);
    const refunded = sum(order.refunds, (r) => r.amountCents);
    const refundable = order.split.chargedCents - refunded;
    if (refundable <= 0) throw conflict("nothing_to_refund", msg().orders.fullyRefunded);
    const amount = input.amountCents ?? refundable;
    if (amount <= 0 || amount > refundable) {
      throw badRequest("invalid_amount", msg().orders.refundRange(fmt().money(1), fmt().money(refundable)), { refundableCents: refundable });
    }
    let stripeRefundId: string | null = null;
    if (this.payments.live && order.paymentIntentId && !order.paymentIntentId.startsWith("pi_sim_")) {
      stripeRefundId = await this.payments.refund(order.paymentIntentId, amount);
    }
    order.refunds.push({ id: stripeRefundId ?? newId("rf"), amountCents: amount, reason: input.reason, createdAt: nowIso() });
    order.status = refunded + amount >= order.split.chargedCents ? "refunded" : "partially_refunded";
    this.messaging.send({
      studioId: order.studioId,
      channel: "email",
      to: order.contact.email,
      template: "refund_issued",
      subject: this.noticesFor(order.parentId).refund.subject(order.number),
      body: this.noticesFor(order.parentId).refund.body(fmt(this.localeFor(order.parentId)).money(amount), order.number),
      orderId: order.id,
      jobId: order.jobId,
      parentId: order.parentId,
      kind: "transactional",
    });
    this.logger.log(`Refunded ${amount} on ${order.number}`);
    return order;
  }

  reprint(order: OrderRow, input: { itemIds: string[]; reason: string }): OrderRow {
    const known = new Set(order.items.map((i) => i.id));
    const bad = input.itemIds.filter((id) => !known.has(id));
    if (input.itemIds.length === 0 || bad.length) throw badRequest("invalid_items", msg().orders.reprintItems, { itemIds: bad });
    order.reprints.push({ id: newId("rp"), itemIds: input.itemIds, reason: input.reason, status: "requested", createdAt: nowIso() });
    const sheet = this.repo.priceSheets.get(this.repo.jobs.get(order.jobId)?.priceSheetId ?? "");
    const lab = this.repo.labs.get(sheet?.labId ?? "");
    this.repo.labSubmissions.insert({
      id: newId("lab"),
      orderId: order.id,
      orderNumber: `${order.number}-R${order.reprints.length}`,
      studioName: order.studioName,
      labId: lab?.id ?? "lab_unknown",
      labName: lab?.name ?? "Lab",
      status: "submitted",
      attempts: 1,
      lastError: null,
      updatedAt: nowIso(),
    });
    return order;
  }
}
