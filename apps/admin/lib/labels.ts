import type { JobStatus, LabSubmission, Locale, MessageLog, OrderStatus, StripeStatus } from "@snapbell/sdk";
import type { BadgeTone } from "@snapbell/ui/badge";
import { adminMsgs } from "@/messages/admin";

const orderTone: Record<OrderStatus, BadgeTone> = {
  paid: "accent",
  at_lab: "sage",
  shipped: "success",
  delivered: "neutral",
  refunded: "danger",
  partially_refunded: "warning",
};
const jobTone: Record<JobStatus, BadgeTone> = { draft: "outline", live: "success", closed: "neutral" };
const labTone: Record<LabSubmission["status"], BadgeTone> = { queued: "outline", submitted: "sage", accepted: "sage", failed: "danger", shipped: "success" };
const stripeTone: Record<StripeStatus, BadgeTone> = { active: "success", pending: "warning", restricted: "danger", not_connected: "outline" };

/** Badge tones for message delivery states. */
export const messageTone: Record<MessageLog["status"], BadgeTone> = {
  queued: "outline",
  sent: "sage",
  delivered: "success",
  failed: "danger",
  suppressed: "warning",
};

function withTone<K extends string>(labels: Record<K, string>, tones: Record<K, BadgeTone>): Record<K, { label: string; tone: BadgeTone }> {
  return Object.fromEntries((Object.keys(tones) as K[]).map((k) => [k, { label: labels[k], tone: tones[k] }])) as Record<K, { label: string; tone: BadgeTone }>;
}

/** Translated enum labels with badge tones. */
export function getLabels(locale: Locale) {
  const t = adminMsgs[locale].labels;
  return {
    orderStatus: withTone(t.orderStatus, orderTone),
    jobStatus: withTone(t.jobStatus, jobTone),
    labStatus: withTone(t.labStatus, labTone),
    stripeStatus: withTone(t.stripeStatus, stripeTone),
    messageStatus: withTone(t.messageStatus, messageTone),
    channel: t.channel,
    timeline: t.timeline,
  };
}
