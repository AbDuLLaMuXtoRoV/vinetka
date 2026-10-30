import { randomBytes, scryptSync } from "node:crypto";
import { DEMO_CREDENTIALS, createDemoData } from "@snapbell/sdk";
import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Loads the shared demo dataset (the same one the API's in-memory store uses)
 * into PostgreSQL: `pnpm --filter @snapbell/db seed` after `prisma migrate dev`.
 */
const prisma = new PrismaClient();

const json = (value: unknown) => value as Prisma.InputJsonValue;
const date = (iso: string | null | undefined) => (iso ? new Date(iso) : null);

/** Same scheme as apps/api (scrypt$salt$hash) so seeded accounts can sign in. */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  return `scrypt$${salt}$${scryptSync(password, salt, 32).toString("base64url")}`;
}

async function main(): Promise<void> {
  const d = createDemoData();
  const passwords = new Map<string, string>(
    [DEMO_CREDENTIALS.owner, DEMO_CREDENTIALS.admin, DEMO_CREDENTIALS.photographer].map((c) => [c.email, hashPassword(c.password)]),
  );

  await prisma.$transaction(async (tx) => {
    await tx.lab.createMany({ data: d.labs.map((l) => ({ id: l.id, name: l.name, region: l.region, turnaroundDays: l.turnaroundDays })) });
    await tx.labProduct.createMany({
      data: d.labProducts.map((p) => ({
        id: p.id, labId: p.labId, sku: p.sku, name: p.name, category: p.category, aspectRatio: p.aspectRatio,
        slots: p.slots, customizable: p.customizable, minLongEdgePx: p.minLongEdgePx, labCostCents: p.labCostCents,
      })),
    });

    await tx.studio.createMany({
      data: d.studios.map((s) => ({
        id: s.id, name: s.name, slug: s.slug, logoUrl: s.logoUrl, brandColor: s.brandColor, markets: s.markets,
        albumDomain: s.albumDomain, defaultLabId: s.defaultLabId, stripeStatus: s.stripe.status, stripeAccountId: s.stripe.accountId,
        payoutSchedule: s.stripe.payoutSchedule, taxLegalName: s.taxInfo.legalName, taxEin: s.taxInfo.ein,
        taxAddress: s.taxInfo.address ? json(s.taxInfo.address) : Prisma.DbNull, onboardingCompleted: s.onboarding.completed,
        bigOrderThresholdCents: s.bigOrderThresholdCents, createdAt: new Date(s.createdAt),
      })),
    });
    await tx.member.createMany({
      data: d.members.map((m) => ({
        id: m.id, studioId: m.studioId, name: m.name, email: m.email, role: m.role, twoFactorEnabled: m.twoFactorEnabled,
        passwordHash: m.status === "invited" ? null : (passwords.get(m.email) ?? null),
        invitedAt: m.status === "invited" ? new Date(d.now) : null, joinedAt: m.status === "active" ? new Date(d.now) : null,
      })),
    });
    await tx.organization.createMany({
      data: d.organizations.map((o) => ({
        id: o.id, studioId: o.studioId, name: o.name, type: o.type, contactName: o.contactName, contactEmail: o.contactEmail,
        contactPhone: o.contactPhone, address: o.address ? json(o.address) : Prisma.DbNull,
      })),
    });

    for (const sheet of d.priceSheets) {
      await tx.priceSheet.create({
        data: {
          id: sheet.id, studioId: sheet.studioId, labId: sheet.labId, name: sheet.name, archived: sheet.archived, updatedAt: new Date(sheet.updatedAt),
          items: { create: sheet.items.map((i, position) => ({ id: i.id, labProductId: i.labProductId, priceCents: i.priceCents, enabled: i.enabled, soldOut: i.soldOut, position })) },
        },
      });
      for (const [position, p] of sheet.packages.entries()) {
        await tx.package.create({
          data: {
            id: p.id, priceSheetId: sheet.id, name: p.name, description: p.description, priceCents: p.priceCents, featured: p.featured,
            enabled: p.enabled, position, lines: { create: p.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })) },
          },
        });
      }
    }

    await tx.job.createMany({
      data: d.jobs.map((j) => ({
        id: j.id, studioId: j.studioId, organizationId: j.organizationId, priceSheetId: j.priceSheetId, name: j.name, market: j.market,
        pictureDay: new Date(j.date), albumType: j.albumType, status: j.status, shipHome: j.shipping.home, shipSchoolPickup: j.shipping.schoolPickup,
        sharedAccessCode: j.sharedAccessCode, publishAt: date(j.publishAt), deadline: date(j.deadline), expiresAt: date(j.expiresAt),
        protection: json(j.protection), allowDigital: j.downloads.allowDigital, allowDownloadAll: j.downloads.allowDownloadAll, createdAt: new Date(j.createdAt),
      })),
    });
    const albumTypeOf = new Map(d.jobs.map((j) => [j.id, j.albumType]));
    await tx.subject.createMany({
      data: d.subjects.map((s) => ({
        id: s.id, jobId: s.jobId, firstName: s.firstName, lastName: s.lastName, group: s.group,
        // Team/Open subjects share Job.sharedAccessCode; only Personal subjects carry their own code.
        accessCode: albumTypeOf.get(s.jobId) === "personal" ? s.accessCode : null,
      })),
    });
    await tx.photo.createMany({
      data: d.photos.map((p) => ({
        id: p.id, jobId: p.jobId, filename: p.filename, originalKey: `originals/${p.jobId}/${p.id}.jpg`,
        previewKey: `derivatives/${p.id}/preview.webp`, thumbKey: `derivatives/${p.id}/thumb.webp`, width: p.width, height: p.height,
        status: p.status, tags: p.tags, group: p.group, labels: p.labels, uploadedAt: new Date(p.uploadedAt),
      })),
    });
    // Duplicates reference other photos, so link them after every photo exists.
    for (const p of d.photos.filter((x) => x.duplicateOfId)) {
      await tx.photo.update({ where: { id: p.id }, data: { duplicateOfId: p.duplicateOfId } });
    }
    await tx.match.createMany({
      data: d.matches.map((m) => ({ id: m.id, jobId: m.jobId, photoId: m.photoId, subjectId: m.subjectId, confidence: m.confidence, status: m.status })),
    });

    await tx.promo.createMany({
      data: d.promos.map((p) => ({
        id: p.id, studioId: p.studioId, code: p.code, kind: p.kind, value: p.value, minSubtotalCents: p.minSubtotalCents,
        startsAt: date(p.startsAt), endsAt: date(p.endsAt), jobIds: p.jobIds, usageLimit: p.usageLimit, usageCount: p.usageCount, active: p.active,
      })),
    });
    await tx.passOffer.createMany({
      data: d.passOffers.map((o) => ({ id: o.id, studioId: o.studioId, jobId: o.jobId, amountsCents: o.amountsCents, bonusBps: o.bonusBps, endsAt: new Date(o.endsAt), active: o.active })),
    });
    await tx.parent.createMany({
      data: d.parents.map((p) => ({
        id: p.id, name: p.name, email: p.email, phone: p.phone, smsUpdates: p.consent.smsUpdates, marketingOptIn: p.consent.marketing,
        biometricsConsentAt: date(p.consent.biometricsAt), notifications: json(p.notifications),
      })),
    });
    const offerForJob = new Map(d.passOffers.map((o) => [o.jobId, o.id]));
    await tx.pass.createMany({
      data: d.passes.map((p) => ({
        id: p.id, offerId: offerForJob.get(p.jobId)!, parentId: p.parentId, amountPaidCents: p.amountPaidCents,
        creditCents: p.creditCents, remainingCents: p.remainingCents, createdAt: new Date(p.createdAt),
      })),
    });
    await tx.parentSubject.createMany({ data: d.parentSubjects.map((ps) => ({ parentId: ps.parentId, subjectId: ps.subjectId, albumCode: ps.albumCode })) });

    for (const o of d.orders) {
      const at = (status: string) => date(o.timeline.find((t) => t.status === status)?.at);
      await tx.order.create({
        data: {
          id: o.id, number: o.number, studioId: o.studioId, jobId: o.jobId, parentId: o.parentId, contact: json(o.contact),
          deliveryMethod: o.delivery.method, address: o.delivery.address ? json(o.delivery.address) : Prisma.DbNull, status: o.status,
          subtotalCents: o.split.subtotalCents, discountCents: o.split.discountCents, shippingCents: o.split.shippingCents, taxCents: o.split.taxCents,
          totalCents: o.split.totalCents, passCreditCents: o.split.passCreditCents, chargedCents: o.split.chargedCents, labCostCents: o.split.labCostCents,
          platformFeeBps: o.split.platformFeeBps, platformFeeCents: o.split.platformFeeCents, cardFeeCents: o.split.cardFeeCents,
          studioPayoutCents: o.split.studioPayoutCents, trackingCarrier: o.tracking?.carrier ?? null, trackingNumber: o.tracking?.number ?? null,
          trackingUrl: o.tracking?.url ?? null, paidAt: at("paid"), atLabAt: at("at_lab"), shippedAt: at("shipped"), deliveredAt: at("delivered"),
          createdAt: new Date(o.createdAt),
          items: {
            create: o.items.map((i) => ({
              id: i.id, kind: i.kind, refId: i.refId, name: i.name, quantity: i.quantity, unitPriceCents: i.unitPriceCents,
              lineTotalCents: i.lineTotalCents, labCostCents: i.labCostCents, subjectId: i.subjectId, subjectName: i.subjectName,
              photoIds: i.photoIds, customization: i.customization ? json(i.customization) : Prisma.DbNull,
            })),
          },
          refunds: { create: o.refunds.map((r) => ({ id: r.id, amountCents: r.amountCents, reason: r.reason, createdAt: new Date(r.createdAt) })) },
        },
      });
    }

    await tx.messageLog.createMany({
      data: d.messages.map((m) => ({
        id: m.id, studioId: m.studioId, channel: m.channel, to: m.to, template: m.template, body: m.body, status: m.status,
        jobId: m.jobId, orderId: m.orderId, createdAt: new Date(m.createdAt),
      })),
    });
    await tx.scheduledMessage.createMany({
      data: d.scheduledMessages.map((m) => ({
        id: m.id, jobId: m.jobId, kind: m.kind, channel: m.channel, sendAt: date(m.sendAt), subject: m.subject, body: m.body, enabled: m.enabled, sentCount: m.sentCount,
      })),
    });
    await tx.labSubmission.createMany({
      data: d.labSubmissions.map((s) => ({ id: s.id, orderId: s.orderId, labId: s.labId, status: s.status, attempts: s.attempts, lastError: s.lastError })),
    });
    await tx.featureFlag.createMany({ data: d.flags.map((f) => ({ key: f.key, description: f.description, enabled: f.enabled, studioIds: f.studioIds })) });
  }, { timeout: 120_000 });

  console.log(`Seeded ${d.studios.length} studios, ${d.jobs.length} jobs, ${d.subjects.length} subjects, ${d.photos.length} photos, ${d.orders.length} orders.`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
