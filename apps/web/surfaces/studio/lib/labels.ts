import type { AlbumType, ExportType, JobStatus, LabSubmission, Locale, Market, OrderStatus, OrganizationType, PromoKind, Role, ScheduledMessageKind } from "@snapbell/sdk";
import type { BadgeTone } from "@snapbell/ui/badge";
import { labelMsgs } from "@studio/messages/labels";

const jobTone: Record<JobStatus, BadgeTone> = { draft: "outline", live: "success", closed: "neutral" };

const orderTone: Record<OrderStatus, BadgeTone> = {
  paid: "accent",
  at_lab: "sage",
  shipped: "success",
  delivered: "neutral",
  refunded: "danger",
  partially_refunded: "warning",
};

const labTone: Record<LabSubmission["status"], BadgeTone> = {
  queued: "outline",
  submitted: "sage",
  accepted: "sage",
  failed: "danger",
  shipped: "success",
};

function withTone<K extends string>(labels: Record<K, string>, tones: Record<K, BadgeTone>): Record<K, { label: string; tone: BadgeTone }> {
  return Object.fromEntries((Object.keys(tones) as K[]).map((k) => [k, { label: labels[k], tone: tones[k] }])) as Record<K, { label: string; tone: BadgeTone }>;
}

/** Translated labels (and badge tones) for enum values. Server: `getLabels(locale)`; client: `useLabels()`. */
export function getLabels(locale: Locale) {
  const t = labelMsgs[locale];
  return {
    ...t,
    jobStatus: withTone(t.jobStatus, jobTone),
    orderStatus: withTone(t.orderStatus, orderTone),
    labStatus: withTone(t.labStatus, labTone),
    albumTypes: t.albumTypes as Record<AlbumType, { label: string; description: string }>,
    markets: t.markets as Record<Market, string>,
    roles: t.roles as Record<Role, string>,
    promoKinds: t.promoKinds as Record<PromoKind, string>,
    messageKinds: t.messageKinds as Record<ScheduledMessageKind, string>,
    exportTypes: t.exportTypes as Record<ExportType, { label: string; description: string }>,
    orgTypes: t.orgTypes as Record<OrganizationType, string>,
  };
}

export type AppLabels = ReturnType<typeof getLabels>;
