import { err, v } from "../i18n";
import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type { LabProduct, Package, PassOffer, PriceSheet, PriceSheetItem, Promo, Studio } from "@snapbell/sdk";
import type { Request } from "express";
import { z } from "zod";
import { newId } from "../common/crypto";
import { badRequest, conflict, notFound } from "../common/errors";
import { nowIso } from "../common/util";
import { cents, id, isoDate, parse } from "../common/validate";
import { Repository } from "../store/repository";
import { AuthService } from "../services/auth.service";
import { ScopeService } from "../services/scope.service";
import { ViewsService } from "../services/views.service";

/** Starting retail price for a lab product: digital at fixed prices, prints at roughly 4× lab cost. */
function suggestedPrice(p: LabProduct): number {
  if (p.category === "digital") return p.slots === 0 ? 5900 : 1900;
  return Math.max(800, Math.ceil((p.labCostCents * 4 + 600) / 100) * 100);
}

function itemFrom(product: LabProduct, over: Partial<PriceSheetItem> = {}): PriceSheetItem {
  return {
    id: over.id ?? newId("psi"),
    labProductId: product.id,
    sku: product.sku,
    name: over.name ?? product.name,
    category: product.category,
    aspectRatio: product.aspectRatio,
    slots: product.slots,
    customizable: product.customizable,
    minLongEdgePx: product.minLongEdgePx,
    // Lab cost always comes from the lab catalog, never from the client.
    labCostCents: product.labCostCents,
    priceCents: over.priceCents ?? suggestedPrice(product),
    enabled: over.enabled ?? true,
    soldOut: over.soldOut ?? false,
  };
}

const itemInput = z.object({
  id: z.string().max(100).optional(),
  labProductId: id,
  name: z.string().trim().min(1).max(120).optional(),
  priceCents: cents,
  enabled: z.boolean().default(true),
  soldOut: z.boolean().default(false),
});
const packageInput = z.object({
  id: z.string().max(100).optional(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
  priceCents: cents,
  lines: z.array(z.object({ itemId: id, quantity: z.number().int().min(1).max(99) })).min(1),
  featured: z.boolean().default(false),
  enabled: z.boolean().default(true),
});
const sheetPatch = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  labId: id.optional(),
  archived: z.boolean().optional(),
  items: z.array(itemInput).max(200).optional(),
  packages: z.array(packageInput).max(50).optional(),
});

const promoFields = {
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{3,20}$/, { error: () => v().promoCodeFormat }),
  kind: z.enum(["percent", "fixed", "free_shipping"]),
  value: z.number().int().min(0).max(100_000_00),
  minSubtotalCents: cents.default(0),
  startsAt: isoDate.nullable().default(null),
  endsAt: isoDate.nullable().default(null),
  jobIds: z.array(id).default([]),
  usageLimit: z.number().int().min(1).nullable().default(null),
  active: z.boolean().default(true),
};
const promoPatch = z.object({
  code: promoFields.code.optional(),
  kind: promoFields.kind.optional(),
  value: promoFields.value.optional(),
  minSubtotalCents: cents.optional(),
  startsAt: isoDate.nullable().optional(),
  endsAt: isoDate.nullable().optional(),
  jobIds: z.array(id).optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  active: z.boolean().optional(),
});
const passOfferFields = z.object({
  jobId: id,
  amountsCents: z.array(z.number().int().min(500).max(100_000)).min(1).max(6),
  bonusBps: z.number().int().min(0).max(5_000),
  endsAt: isoDate,
  active: z.boolean().default(true),
});
const passOfferPatch = z.object({
  jobId: id.optional(),
  amountsCents: z.array(z.number().int().min(500).max(100_000)).min(1).max(6).optional(),
  bonusBps: z.number().int().min(0).max(5_000).optional(),
  endsAt: isoDate.optional(),
  active: z.boolean().optional(),
});

@Controller()
export class CatalogController {
  constructor(
    private readonly repo: Repository,
    private readonly auth: AuthService,
    private readonly scope: ScopeService,
    private readonly views: ViewsService,
  ) {}

  // --- Labs ---------------------------------------------------------------------------

  @Get("labs")
  labs(@Req() req: Request) {
    this.auth.staff(req);
    return this.repo.labs.all();
  }

  @Get("labs/:id/products")
  labProducts(@Req() req: Request, @Param("id") labId: string) {
    this.auth.staff(req);
    if (!this.repo.labs.get(labId)) throw notFound(err().notFound.lab);
    return this.repo.labProducts.filter((p) => p.labId === labId);
  }

  // --- Price sheets ---------------------------------------------------------------------

  @Get("price-sheets")
  priceSheets(@Req() req: Request) {
    const { studio } = this.auth.staff(req);
    return this.repo.priceSheets
      .filter((s) => s.studioId === studio.id)
      .map((s) => this.views.priceSheetSummary(s))
      .sort((a, b) => Number(a.archived) - Number(b.archived) || b.updatedAt.localeCompare(a.updatedAt));
  }

  @Get("price-sheets/:id")
  priceSheet(@Req() req: Request, @Param("id") sheetId: string) {
    const { studio } = this.auth.staff(req);
    return this.views.priceSheet(this.scope.priceSheet(studio, sheetId));
  }

  @Post("price-sheets")
  createPriceSheet(@Req() req: Request, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const input = parse(z.object({ name: z.string().trim().min(1).max(120), labId: id }), body);
    const lab = this.repo.labs.get(input.labId);
    if (!lab) throw badRequest("invalid_lab", err().catalog.unknownLab);
    const sheet: PriceSheet = {
      id: newId("ps"),
      studioId: studio.id,
      name: input.name,
      labId: lab.id,
      labName: lab.name,
      archived: false,
      items: this.repo.labProducts.filter((p) => p.labId === lab.id).map((p) => itemFrom(p)),
      packages: [],
      jobsUsing: 0,
      updatedAt: nowIso(),
    };
    this.repo.priceSheets.insert(sheet);
    return this.views.priceSheet(sheet);
  }

  @Patch("price-sheets/:id")
  updatePriceSheet(@Req() req: Request, @Param("id") sheetId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const sheet = this.scope.priceSheet(studio, sheetId);
    const input = parse(sheetPatch, body);

    let labId = sheet.labId;
    if (input.labId && input.labId !== sheet.labId) {
      const lab = this.repo.labs.get(input.labId);
      if (!lab) throw badRequest("invalid_lab", err().catalog.unknownLab);
      labId = lab.id;
    }
    const productFor = (labProductId: string) => {
      const p = this.repo.labProducts.get(labProductId);
      if (!p || p.labId !== labId) throw badRequest("invalid_product", err().catalog.productNotOffered(labProductId));
      return p;
    };

    let items = sheet.items;
    if (input.items) {
      items = input.items.map((i) => itemFrom(productFor(i.labProductId), { ...i, id: i.id || undefined }));
    } else if (labId !== sheet.labId) {
      // Switching labs without new rows: carry prices over to the new lab's equivalent products.
      items = sheet.items.flatMap((old) => {
        const p = this.repo.labProducts.find((x) => x.labId === labId && x.name === old.name);
        return p ? [itemFrom(p, { id: old.id, name: old.name, priceCents: old.priceCents, enabled: old.enabled, soldOut: old.soldOut })] : [];
      });
    }
    let packages = sheet.packages;
    if (input.packages) {
      const itemIds = new Set(items.map((i) => i.id));
      packages = input.packages.map((p): Package => {
        const missing = p.lines.filter((l) => !itemIds.has(l.itemId));
        if (missing.length) throw badRequest("invalid_package", err().catalog.packageMissingItems(p.name));
        return { ...p, id: p.id || newId("pkg") };
      });
    } else {
      const itemIds = new Set(items.map((i) => i.id));
      packages = packages.filter((p) => p.lines.every((l) => itemIds.has(l.itemId)));
    }

    Object.assign(sheet, {
      name: input.name ?? sheet.name,
      archived: input.archived ?? sheet.archived,
      labId,
      labName: this.repo.labs.get(labId)?.name ?? sheet.labName,
      items,
      packages,
      updatedAt: nowIso(),
    });
    return this.views.priceSheet(sheet);
  }

  @Post("price-sheets/:id/duplicate")
  duplicatePriceSheet(@Req() req: Request, @Param("id") sheetId: string) {
    const { studio } = this.auth.staff(req);
    const source = this.scope.priceSheet(studio, sheetId);
    const idMap = new Map(source.items.map((i) => [i.id, newId("psi")]));
    const sheet: PriceSheet = {
      ...structuredClone(source),
      id: newId("ps"),
      name: `${source.name} (copy)`,
      archived: false,
      items: source.items.map((i) => ({ ...i, id: idMap.get(i.id)! })),
      packages: source.packages.map((p) => ({ ...p, id: newId("pkg"), lines: p.lines.map((l) => ({ ...l, itemId: idMap.get(l.itemId) ?? l.itemId })) })),
      updatedAt: nowIso(),
    };
    this.repo.priceSheets.insert(sheet);
    return this.views.priceSheet(sheet);
  }

  // --- Promos and Picture Day Pass offers -------------------------------------------------

  private checkJobs(studio: Studio, jobIds: string[]) {
    for (const jobId of jobIds) this.scope.job(studio, jobId);
  }

  @Get("promos")
  promos(@Req() req: Request) {
    const { studio } = this.auth.staff(req);
    return this.repo.promos.filter((p) => p.studioId === studio.id).sort((a, b) => Number(b.active) - Number(a.active) || a.code.localeCompare(b.code));
  }

  @Post("promos")
  createPromo(@Req() req: Request, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const input = parse(z.object(promoFields), body);
    if (input.kind === "percent" && input.value > 10_000) throw badRequest("invalid_value", err().catalog.percentMax);
    this.checkJobs(studio, input.jobIds);
    if (this.repo.promos.find((p) => p.studioId === studio.id && p.code === input.code)) throw conflict("code_taken", err().catalog.promoCodeTaken(input.code));
    const promo: Promo = { id: newId("promo"), studioId: studio.id, usageCount: 0, ...input };
    return this.repo.promos.insert(promo);
  }

  @Patch("promos/:id")
  updatePromo(@Req() req: Request, @Param("id") promoId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const promo = this.scope.promo(studio, promoId);
    const input = parse(promoPatch, body);
    if (input.jobIds) this.checkJobs(studio, input.jobIds);
    if (input.code && input.code !== promo.code && this.repo.promos.find((p) => p.studioId === studio.id && p.code === input.code)) {
      throw conflict("code_taken", err().catalog.promoCodeTaken(input.code));
    }
    Object.assign(promo, input);
    if (promo.kind === "percent" && promo.value > 10_000) throw badRequest("invalid_value", err().catalog.percentMax);
    return promo;
  }

  @Get("promos/pass-offers")
  passOffers(@Req() req: Request) {
    const { studio } = this.auth.staff(req);
    return this.repo.passOffers.filter((o) => o.studioId === studio.id).map((o) => this.views.passOffer(o));
  }

  @Post("promos/pass-offers")
  createPassOffer(@Req() req: Request, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const input = parse(passOfferFields, body);
    const job = this.scope.job(studio, input.jobId);
    const offer: PassOffer = { id: newId("po"), studioId: studio.id, jobName: job.name, soldCount: 0, ...input, amountsCents: [...new Set(input.amountsCents)].sort((a, b) => a - b) };
    this.repo.passOffers.insert(offer);
    return this.views.passOffer(offer);
  }

  @Patch("promos/pass-offers/:id")
  updatePassOffer(@Req() req: Request, @Param("id") offerId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const offer = this.scope.passOffer(studio, offerId);
    const input = parse(passOfferPatch, body);
    if (input.jobId) this.scope.job(studio, input.jobId);
    Object.assign(offer, input);
    return this.views.passOffer(offer);
  }
}
