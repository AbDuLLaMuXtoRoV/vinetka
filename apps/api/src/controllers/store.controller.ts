import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Req } from "@nestjs/common";
import {
  SHIPPING_CENTS,
  passCredit,
  type AccountSummary,
  type Pass,
  type Shop,
  type ShopPackage,
  type ShopProduct,
} from "@snapbell/sdk";
import type { Request } from "express";
import { z } from "zod";
import { newId } from "../common/crypto";
import { badRequest, conflict, forbidden, notFound } from "../common/errors";
import { DAY_MS, RateLimiter, clientIp, nowIso, sum } from "../common/util";
import { addressSchema, id, parse } from "../common/validate";
import { Repository, type CartRow, type ParentRow } from "../store/repository";
import { AlbumsService, branding, type ResolvedAlbum } from "../services/albums.service";
import { AuthService } from "../services/auth.service";
import { CommerceService } from "../services/commerce.service";
import { MediaService } from "../services/media.service";
import { MessagingService } from "../services/messaging.service";
import { PaymentsService } from "../services/payments.service";
import { ViewsService } from "../services/views.service";
import { currentLocale, err, labels, notices, fmt, v } from "../i18n";

const customization = z
  .object({
    crop: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0).max(1), height: z.number().min(0).max(1) }).nullable().optional(),
    background: z.string().max(40).nullable().optional(),
    theme: z.string().max(40).nullable().optional(),
    nameText: z.string().max(60).nullable().optional(),
    retouch: z.boolean().optional(),
  })
  .transform((c) => ({ crop: c.crop ?? null, background: c.background ?? null, theme: c.theme ?? null, nameText: c.nameText ?? null, retouch: c.retouch ?? false }));

const cartItem = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(["product", "package"]),
  refId: id,
  quantity: z.number().int().min(1).max(99),
  albumCode: z.string().min(1).max(20),
  subjectId: z.string().max(100).nullable().optional().transform((v) => v ?? null),
  photoIds: z.array(id).max(500).default([]),
  customization: customization.nullable().optional().transform((v) => v ?? null),
});

const checkoutSchema = z.object({
  cartId: id,
  contact: z.object({
    name: z.string().trim().min(1, { error: () => v().enterName }).max(120),
    email: z.email({ error: () => v().email }).max(200),
    phone: z.string().trim().max(30).nullable().optional().transform((v) => v || null),
  }),
  delivery: z.object({ method: z.enum(["home", "school_pickup"]), address: addressSchema.nullable().optional().transform((v) => v ?? null) }),
  payment: z.object({ method: z.enum(["card", "apple_pay", "google_pay"]), paymentMethodId: z.string().max(200).nullable().optional().transform((v) => v ?? null) }),
});

@Controller()
export class StoreController {
  /** Album lookups: generous for normal browsing, strict for wrong codes (brute-force guard). */
  private readonly lookups = new RateLimiter(120, 60_000);
  private readonly wrongCodes = new RateLimiter(10, 15 * 60_000, () => err().rate.wrongCodes);

  constructor(
    private readonly repo: Repository,
    private readonly auth: AuthService,
    private readonly albums: AlbumsService,
    private readonly commerce: CommerceService,
    private readonly views: ViewsService,
    private readonly media: MediaService,
    private readonly payments: PaymentsService,
    private readonly messaging: MessagingService,
  ) {}

  private resolve(req: Request, code: string): ResolvedAlbum {
    const ip = clientIp(req);
    this.lookups.hit(ip);
    try {
      return this.albums.resolve(code);
    } catch (err) {
      this.wrongCodes.hit(ip);
      throw err;
    }
  }

  /** Resolves, checks publish state and access, and unlocks the album for this parent. */
  private open(req: Request, code: string): { r: ResolvedAlbum; parent: ParentRow } {
    const parent = this.auth.parent(req);
    const r = this.resolve(req, code);
    this.albums.assertOpen(r);
    this.albums.unlock(r, parent);
    return { r, parent };
  }

  // --- Albums ---------------------------------------------------------------------------

  @Get("albums/:code")
  album(@Req() req: Request, @Param("code") code: string) {
    const { r, parent } = this.open(req, code);
    return this.albums.build(r, parent);
  }

  /**
   * Public: the studio's branding for the code-entry screen. Answers 409
   * not_published / 410 expired like the album itself, so the shop can show the
   * album's state (date + "notify me", or closed) before asking for a phone number.
   */
  @Get("albums/:code/branding")
  branding(@Req() req: Request, @Param("code") code: string) {
    const r = this.resolve(req, code);
    this.albums.assertOpen(r);
    return branding(r.studio);
  }

  @Post("albums/:code/notify")
  @HttpCode(200)
  notify(@Req() req: Request, @Param("code") code: string, @Body() body: unknown) {
    const r = this.resolve(req, code);
    const { destination } = parse(z.object({ destination: z.string().trim().min(3).max(200) }), body);
    this.albums.notify(r, destination);
    return { ok: true as const };
  }

  @Post("albums/:code/find-me")
  @HttpCode(200)
  findMe(@Req() req: Request, @Param("code") code: string, @Body() body: unknown) {
    const { r, parent } = this.open(req, code);
    const input = parse(
      z.object({
        imageBase64: z.string().min(1).max(15_000_000),
        consent: z.literal(true, { error: () => v().selfieConsent }),
      }),
      body,
    );
    // The selfie is used for this one search and never stored.
    const photos = this.albums.findMe(r, parent, input.imageBase64);
    const opts = this.albums.previewOptions(r, parent);
    return { photos: photos.map((p) => this.media.albumPhoto(p, opts)), searchedAt: nowIso() };
  }

  @Post("albums/:code/photos")
  @HttpCode(200)
  addPhotos(@Req() req: Request, @Param("code") code: string, @Body() body: unknown) {
    const { r, parent } = this.open(req, code);
    if (r.job.albumType === "personal") throw badRequest("not_available", err().album.personalHasPhotos);
    const { photoIds } = parse(z.object({ photoIds: z.array(id).min(1).max(500) }), body);
    this.albums.savePhotoSet("albumAdditions", r, parent, photoIds, true);
    return this.albums.build(r, parent);
  }

  @Put("albums/:code/favorites")
  setFavorites(@Req() req: Request, @Param("code") code: string, @Body() body: unknown) {
    const { r, parent } = this.open(req, code);
    const { photoIds } = parse(z.object({ photoIds: z.array(id).max(1_000) }), body);
    return { favorites: this.albums.savePhotoSet("favorites", r, parent, photoIds, false) };
  }

  @Get("albums/:code/shop")
  shop(@Req() req: Request, @Param("code") code: string): Shop {
    const { r, parent } = this.open(req, code);
    const sheet = this.repo.priceSheets.get(r.job.priceSheetId);
    if (!sheet) throw notFound(err().notFound.priceSheet);
    const { downloads } = r.job;
    const sellable = (i: (typeof sheet.items)[number]) =>
      i.enabled && !i.soldOut && (i.category !== "digital" || (downloads.allowDigital && (i.slots !== 0 || downloads.allowDownloadAll)));
    const itemById = new Map(sheet.items.map((i) => [i.id, i]));

    const products: ShopProduct[] = sheet.items.filter(sellable).map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      priceCents: i.priceCents,
      aspectRatio: i.aspectRatio,
      slots: i.slots,
      customizable: i.customizable,
      minLongEdgePx: i.minLongEdgePx,
    }));
    const packages: ShopPackage[] = sheet.packages
      .filter((p) => p.enabled && p.lines.every((l) => itemById.has(l.itemId) && sellable(itemById.get(l.itemId)!)))
      .map((p) => {
        const separately = sum(p.lines, (l) => itemById.get(l.itemId)!.priceCents * l.quantity);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          priceCents: p.priceCents,
          contents: p.lines.map((l) => `${l.quantity} × ${itemById.get(l.itemId)!.name}`),
          savingsCents: Math.max(0, separately - p.priceCents),
          featured: p.featured,
          slots: 1,
        };
      })
      .sort((a, b) => Number(b.featured) - Number(a.featured));

    const visible = new Set(this.albums.visiblePhotos(r, parent).map((p) => p.id));
    const favorites = (this.repo.favorites.get(`${parent.id}:${r.code}`)?.photoIds ?? []).filter((pid) => visible.has(pid));
    const suggested = packages.find((p) => p.featured) ?? packages[0];
    const org = this.repo.organizations.get(r.job.organizationId);

    return {
      albumCode: r.code,
      packages,
      products,
      suggestedBundle: suggested && favorites.length > 0 ? { packageId: suggested.id, photoIds: favorites } : null,
      shippingOptions: [
        ...(r.job.shipping.home ? [{ method: "home" as const, label: labels().shipping.home, priceCents: SHIPPING_CENTS.home }] : []),
        ...(r.job.shipping.schoolPickup
          ? [{ method: "school_pickup" as const, label: labels().shipping.pickup(org?.name ?? labels().shipping.school), priceCents: SHIPPING_CENTS.school_pickup }]
          : []),
      ],
    };
  }

  // --- Cart and checkout ------------------------------------------------------------------

  private cartFor(req: Request, cartId: string): CartRow {
    const cart = this.repo.carts.get(cartId);
    if (!cart) throw notFound(err().notFound.cart);
    const parent = this.auth.optionalParent(req);
    if (cart.parentId && cart.parentId !== parent?.id) throw forbidden(err().cart.notYours);
    if (!cart.parentId && parent) cart.parentId = parent.id;
    return cart;
  }

  @Post("carts")
  createCart(@Req() req: Request, @Body() body: unknown) {
    const { albumCode } = parse(z.object({ albumCode: z.string().min(1).max(20) }), body);
    const r = this.resolve(req, albumCode);
    this.albums.assertOpen(r);
    const parent = this.auth.optionalParent(req);
    const cart: CartRow = {
      id: newId("cart"),
      studioId: r.studio.id,
      parentId: parent?.id ?? null,
      items: [],
      promoCode: null,
      deliveryMethod: r.job.shipping.home ? "home" : "school_pickup",
      postalCode: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.repo.carts.insert(cart);
    return this.commerce.view(cart);
  }

  @Get("carts/:id")
  getCart(@Req() req: Request, @Param("id") cartId: string) {
    return this.commerce.view(this.cartFor(req, cartId));
  }

  @Patch("carts/:id")
  updateCart(@Req() req: Request, @Param("id") cartId: string, @Body() body: unknown) {
    const cart = this.cartFor(req, cartId);
    const input = parse(
      z.object({
        items: z.array(cartItem).max(100).optional(),
        promoCode: z.string().trim().max(30).nullable().optional(),
        deliveryMethod: z.enum(["home", "school_pickup"]).optional(),
        postalCode: z.string().trim().max(10).optional(),
      }),
      body,
    );
    const ids = input.items?.map((i) => i.id) ?? [];
    if (new Set(ids).size !== ids.length) throw badRequest("duplicate_item", err().cart.duplicateItem);
    return this.commerce.updateCart(cart, input);
  }

  @Post("checkout")
  @HttpCode(200)
  checkout(@Req() req: Request, @Body() body: unknown) {
    const parent = this.auth.parent(req);
    return this.commerce.checkout(parent, parse(checkoutSchema, body));
  }

  @Post("checkout/:orderId/confirm")
  @HttpCode(200)
  confirm(@Req() req: Request, @Param("orderId") orderId: string) {
    const parent = this.auth.parent(req);
    const order = this.repo.orders.get(orderId);
    if (!order || order.parentId !== parent.id) throw notFound(err().notFound.order);
    return this.commerce.confirm(order);
  }

  // --- Picture Day Pass ---------------------------------------------------------------------

  @Get("passes/offers/:jobId")
  passOffer(@Param("jobId") jobId: string) {
    const offer = this.repo.passOffers.find((o) => o.jobId === jobId && o.active && Date.parse(o.endsAt) > Date.now());
    const job = this.repo.jobs.get(jobId);
    const studio = job ? this.repo.studios.get(job.studioId) : undefined;
    if (!offer || !job || !studio) throw notFound(err().notFound.passOffer);
    return {
      ...this.views.passOffer(offer),
      studio: branding(studio),
      organizationName: this.repo.organizations.get(job.organizationId)?.name ?? job.organizationName,
      pictureDay: job.date,
    };
  }

  @Post("passes")
  async buyPass(@Req() req: Request, @Body() body: unknown) {
    const input = parse(
      z.object({
        offerId: id,
        amountCents: z.number().int().min(1),
        contact: z.object({
          name: z.string().trim().min(1).max(120),
          email: z.email().max(200),
          phone: z.string().trim().max(30).nullable().optional().transform((v) => v || null),
        }),
      }),
      body,
    );
    const offer = this.repo.passOffers.get(input.offerId);
    if (!offer || !offer.active || Date.parse(offer.endsAt) <= Date.now()) throw notFound(err().notFound.passOffer);
    if (!offer.amountsCents.includes(input.amountCents)) throw badRequest("invalid_amount", err().pass.invalidAmount);
    const studio = this.repo.studios.get(offer.studioId)!;

    const email = input.contact.email.toLowerCase();
    const phone = input.contact.phone ? this.auth.normalizeDestination("sms", input.contact.phone) : null;
    let parent = this.auth.optionalParent(req) ?? this.repo.parents.find((p) => p.email === email || (!!phone && p.phone === phone));
    if (!parent) {
      parent = this.repo.parents.insert({
        id: newId("par"),
        name: input.contact.name,
        email,
        phone,
        locale: currentLocale(),
        consent: { smsUpdates: false, marketing: false, biometricsAt: null },
        notifications: { orderUpdates: true, galleryReady: true, deadlineReminders: true, channel: phone ? "sms" : "email" },
        deletionRequestedAt: null,
        exportRequestedAt: null,
        createdAt: nowIso(),
      });
    }

    let clientSecret: string | null = null;
    if (this.payments.live && studio.stripe.accountId) {
      const pi = await this.payments.createPaymentIntent({
        amountCents: input.amountCents,
        applicationFeeCents: 0,
        destinationAccountId: studio.stripe.accountId,
        orderId: `pass:${offer.id}`,
        orderNumber: `PASS-${offer.id}`,
        email,
      });
      clientSecret = pi.clientSecret;
    }
    const credit = passCredit(input.amountCents, offer.bonusBps);
    const pass: Pass = {
      id: newId("pass"),
      jobId: offer.jobId,
      parentId: parent.id,
      studioId: studio.id,
      amountPaidCents: input.amountCents,
      creditCents: credit,
      remainingCents: credit,
      createdAt: nowIso(),
    };
    this.repo.passes.insert(pass);
    offer.soldCount += 1;
    this.messaging.send({
      studioId: studio.id,
      channel: "email",
      to: email,
      template: "pass_confirmation",
      subject: notices(parent.locale).pass.subject,
      body: notices(parent.locale).pass.body(fmt(parent.locale).money(credit), offer.jobName, studio.name),
      jobId: offer.jobId,
      parentId: parent.id,
      kind: "transactional",
    });
    return { pass, clientSecret };
  }

  // --- Family account ---------------------------------------------------------------------

  @Get("account")
  account(@Req() req: Request): AccountSummary {
    const parent = this.auth.parent(req);
    const children = this.repo.parentSubjects
      .filter((ps) => ps.parentId === parent.id)
      .flatMap((ps) => {
        const subject = this.repo.subjects.get(ps.subjectId);
        const job = subject ? this.repo.jobs.get(subject.jobId) : undefined;
        const studio = job ? this.repo.studios.get(job.studioId) : undefined;
        if (!subject || !job || !studio) return [];
        return [{
          subjectId: subject.id,
          name: `${subject.firstName} ${subject.lastName}`,
          studioName: studio.name,
          jobName: job.name,
          year: new Date(job.date).getUTCFullYear(),
          albumCode: ps.albumCode,
        }];
      });
    return {
      parent: this.views.parent(parent),
      children,
      orders: this.views.byNewest(this.views.paidOrders((o) => o.parentId === parent.id)).map((o) => this.views.orderSummary(o)),
      passes: this.repo.passes.filter((p) => p.parentId === parent.id),
    };
  }

  @Patch("account")
  updateAccount(@Req() req: Request, @Body() body: unknown) {
    const parent = this.auth.parent(req);
    const input = parse(
      z.object({
        name: z.string().trim().max(120).nullable().optional(),
        email: z.email().max(200).nullable().optional(),
        phone: z.string().trim().max(30).nullable().optional(),
        notifications: z
          .object({ orderUpdates: z.boolean(), galleryReady: z.boolean(), deadlineReminders: z.boolean(), channel: z.enum(["sms", "email"]) })
          .partial()
          .optional(),
        consent: z.object({ smsUpdates: z.boolean(), marketing: z.boolean() }).partial().optional(),
        locale: z.enum(["en", "ru", "uz"]).optional(),
      }),
      body,
    );
    if (input.email !== undefined) {
      const email = input.email?.toLowerCase() ?? null;
      if (email && this.repo.parents.find((p) => p.id !== parent.id && p.email === email)) throw conflict("email_taken", err().account.emailTaken);
      parent.email = email;
    }
    if (input.phone !== undefined) {
      const phone = input.phone ? this.auth.normalizeDestination("sms", input.phone) : null;
      if (phone && this.repo.parents.find((p) => p.id !== parent.id && p.phone === phone)) throw conflict("phone_taken", err().account.phoneTaken);
      parent.phone = phone;
    }
    if (input.name !== undefined) parent.name = input.name || null;
    if (input.notifications) parent.notifications = { ...parent.notifications, ...input.notifications };
    if (input.consent) parent.consent = { ...parent.consent, ...input.consent };
    if (input.locale) parent.locale = input.locale;
    return this.views.parent(parent);
  }

  @Post("account/data-export")
  @HttpCode(200)
  dataExport(@Req() req: Request) {
    const parent = this.auth.parent(req);
    parent.exportRequestedAt = nowIso();
    const deliverTo = parent.email ?? parent.phone ?? "your account";
    if (parent.email) {
      this.messaging.send({
        studioId: null,
        channel: "email",
        to: parent.email,
        template: "data_export_requested",
        subject: notices(parent.locale).dataExport.subject,
        body: notices(parent.locale).dataExport.body,
        parentId: parent.id,
        kind: "transactional",
      });
    }
    return { requestedAt: parent.exportRequestedAt, deliverTo };
  }

  @Post("account/deletion")
  @HttpCode(200)
  deletion(@Req() req: Request) {
    const parent = this.auth.parent(req);
    parent.deletionRequestedAt = nowIso();
    // Face data from selfie searches is never stored; consent records are cleared now, the rest within 30 days.
    parent.consent = { ...parent.consent, biometricsAt: null, marketing: false };
    const completesBy = new Date(Date.now() + 30 * DAY_MS).toISOString();
    if (parent.email) {
      this.messaging.send({
        studioId: null,
        channel: "email",
        to: parent.email,
        template: "data_deletion_requested",
        subject: notices(parent.locale).deletion.subject,
        body: notices(parent.locale).deletion.body(fmt(parent.locale).date(completesBy)),
        parentId: parent.id,
        kind: "transactional",
      });
    }
    return { requestedAt: parent.deletionRequestedAt, completesBy };
  }
}
