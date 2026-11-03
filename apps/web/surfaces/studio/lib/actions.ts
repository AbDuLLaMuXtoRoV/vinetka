"use server";

import {
  ApiError,
  createClient,
  type CartItem,
  type ExportType,
  type ID,
  type JobInput,
  type Market,
  type OrganizationType,
  type PassOfferInput,
  type Photo,
  type PriceSheetInput,
  type PromoInput,
  type Role,
  type ScheduledMessage,
  type StudioPatch,
  type SubjectInput,
} from "@snapbell/sdk";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionCookieOptions } from "./api";
import { env } from "./env";
import { forwardedHeaders } from "./forwarded";
import { getLocale } from "./i18n";
import { authMsgs } from "@studio/messages/auth";
import { setupMsgs } from "@studio/messages/setup";
import { act } from "./result";

// --- Auth -------------------------------------------------------------------------

export interface LoginState {
  error: string | null;
  email: string;
}

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  const locale = await getLocale();
  const t = authMsgs[locale].errors;
  if (!email || !password) return { error: t.missing, email };

  let destination = "/studio/home";
  try {
    const session = await createClient({ baseUrl: env.apiUrl, locale, headers: await forwardedHeaders() }).auth.login({ email, password });
    (await cookies()).set(SESSION_COOKIE, session.token, sessionCookieOptions);
    if (!session.studio.onboarding.done) destination = "/studio/onboarding";
    else if (next.startsWith("/") && !next.startsWith("//")) destination = next;
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 429) return { error: t.tooMany, email };
      return { error: e.status === 401 || e.status === 400 ? t.wrong : e.message, email };
    }
    return { error: t.unreachable, email };
  }
  redirect(destination);
}

export async function magicLinkAction(email: string) {
  const locale = await getLocale();
  try {
    const res = await createClient({ baseUrl: env.apiUrl, locale, headers: await forwardedHeaders() }).auth.magicLink({ email });
    return { ok: true as const, devLink: res.devLink };
  } catch (e) {
    return { ok: false as const, error: e instanceof ApiError ? e.message : authMsgs[locale].errors.unreachableShort };
  }
}

export interface SetupState {
  error: string | null;
  field: "password" | "confirm" | null;
}

/** /setup: a new owner or invited team member chooses a password with their one-time link. */
export async function completeSetupAction(_prev: SetupState, form: FormData): Promise<SetupState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const locale = await getLocale();
  const t = setupMsgs[locale].errors;
  if (password.length < 8) return { error: t.short, field: "password" };
  if (password !== confirm) return { error: t.mismatch, field: "confirm" };

  let destination = "/studio/home";
  try {
    const session = await createClient({ baseUrl: env.apiUrl, locale, headers: await forwardedHeaders() }).auth.completeSetup({ token, password });
    (await cookies()).set(SESSION_COOKIE, session.token, sessionCookieOptions);
    if (session.member.role === "owner" && !session.studio.onboarding.done) destination = "/studio/onboarding";
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : t.unreachable, field: null };
  }
  redirect(destination);
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/studio/login");
}

// --- Studio, onboarding, team ----------------------------------------------------------

export async function updateStudio(patch: StudioPatch) {
  return act((c) => c.studio.update(patch), ["layout:/"]);
}

export async function connectStripe() {
  return act((c) => c.studio.connectStripe(), ["layout:/"]);
}

export async function inviteMember(input: { email: string; name: string; role: Role }) {
  return act((c) => c.studio.invite(input), "/studio/settings/studio");
}

/** A fresh setup link for an invited member; the previous link stops working. */
export async function newMemberSetupLink(id: ID) {
  return act((c) => c.studio.memberSetupLink(id), "/studio/settings/studio");
}

export async function updateMemberRole(id: ID, role: Role) {
  return act((c) => c.studio.updateMember(id, { role }), "/studio/settings/studio");
}

// --- Jobs ----------------------------------------------------------------------------

const ORG_TYPE_BY_MARKET: Partial<Record<Market, OrganizationType>> = {
  schools: "school",
  sports: "league",
  dance: "dance_studio",
  preschool: "preschool",
};

/** "  School   No. 45 " and "school no. 45" are the same client. */
function sameName(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return norm(a) === norm(b);
}

/**
 * Jobs name their school, team or event as free text. Behind the scenes each
 * name maps to one organization record: reused when the studio typed the same
 * name before, created otherwise.
 */
export async function createJob(input: Omit<JobInput, "organizationId"> & { clientName: string }) {
  const { clientName, ...job } = input;
  const name = clientName.trim().replace(/\s+/g, " ");
  return act(async (c) => {
    const existing = (await c.organizations.list()).find((o) => sameName(o.name, name));
    const organization =
      existing ??
      (await c.organizations.create({
        name,
        type: ORG_TYPE_BY_MARKET[job.market] ?? "client",
        contactName: "",
        contactEmail: "",
        contactPhone: null,
        address: null,
      }));
    return c.jobs.create({ ...job, organizationId: organization.id });
  }, ["/studio/jobs", "/studio/home", "/studio/jobs/new"]);
}

export async function updateJob(id: ID, input: Partial<JobInput>) {
  return act((c) => c.jobs.update(id, input), [`/studio/jobs/${id}`, "/studio/jobs"]);
}

export async function publishJob(id: ID) {
  return act((c) => c.jobs.publish(id), [`/studio/jobs/${id}`, "/studio/jobs", "/studio/home"]);
}

export async function closeJob(id: ID) {
  return act((c) => c.jobs.close(id), [`/studio/jobs/${id}`, "/studio/jobs", "/studio/home"]);
}

export async function extendJob(id: ID, deadline: string) {
  return act((c) => c.jobs.extend(id, { deadline }), [`/studio/jobs/${id}`, "/studio/jobs"]);
}

export async function duplicateJob(id: ID) {
  return act((c) => c.jobs.duplicate(id), "/studio/jobs");
}

export async function releaseBulkBatch(jobId: ID, batchId: ID) {
  return act((c) => c.jobs.releaseBulkBatch(jobId, batchId), `/studio/jobs/${jobId}/orders`);
}

export async function updateScheduledMessage(
  jobId: ID,
  messageId: ID,
  patch: Partial<Pick<ScheduledMessage, "sendAt" | "subject" | "body" | "enabled" | "channel">>,
) {
  return act((c) => c.jobs.updateMessage(jobId, messageId, patch), `/studio/jobs/${jobId}/marketing`);
}

export async function testScheduledMessage(jobId: ID, messageId: ID, to: string) {
  return act((c) => c.jobs.testMessage(jobId, messageId, { to }));
}

export async function createExport(jobId: ID, type: ExportType, label?: string) {
  return act((c) => c.jobs.createExport(jobId, { type, label }), `/studio/jobs/${jobId}/exports`);
}

// --- Roster --------------------------------------------------------------------------

export async function createSubject(jobId: ID, input: SubjectInput) {
  return act((c) => c.subjects.create(jobId, input), `/studio/jobs/${jobId}/roster`);
}

export async function updateSubject(jobId: ID, id: ID, input: Partial<SubjectInput>) {
  return act((c) => c.subjects.update(id, input), `/studio/jobs/${jobId}/roster`);
}

export async function removeSubject(jobId: ID, id: ID) {
  return act((c) => c.subjects.remove(id), `/studio/jobs/${jobId}/roster`);
}

export async function importSubjects(
  jobId: ID,
  csv: string,
  mapping: { firstName: string; lastName: string; group: string; accessCode?: string },
) {
  return act((c) => c.subjects.import(jobId, { csv, mapping }), [`/studio/jobs/${jobId}/roster`, `/studio/jobs/${jobId}`]);
}

export async function regenerateCodes(jobId: ID, subjectIds?: ID[]) {
  return act((c) => c.subjects.regenerateCodes(jobId, { subjectIds }), `/studio/jobs/${jobId}/roster`);
}

// --- Photos --------------------------------------------------------------------------

export async function presignUploads(jobId: ID, files: Array<{ name: string; size: number; type: string }>) {
  return act((c) => c.photos.presign(jobId, { files }));
}

export async function completeUpload(uploadId: ID, dims: { width?: number; height?: number }) {
  return act((c) => c.photos.complete(uploadId, dims));
}

export async function updatePhoto(jobId: ID, id: ID, patch: Partial<Pick<Photo, "tags" | "group" | "labels">>) {
  return act((c) => c.photos.update(id, patch), `/studio/jobs/${jobId}/photos`);
}

export async function removePhoto(jobId: ID, id: ID) {
  return act((c) => c.photos.remove(id), `/studio/jobs/${jobId}/photos`);
}

// --- Matching ------------------------------------------------------------------------

export async function acceptMatch(jobId: ID, id: ID) {
  return act((c) => c.matches.accept(id), `/studio/jobs/${jobId}/matching`);
}

export async function rejectMatch(jobId: ID, id: ID) {
  return act((c) => c.matches.reject(id), `/studio/jobs/${jobId}/matching`);
}

export async function reassignMatch(jobId: ID, id: ID, subjectId: ID) {
  return act((c) => c.matches.reassign(id, { subjectId }), `/studio/jobs/${jobId}/matching`);
}

export async function bulkAcceptMatches(jobId: ID, matchIds: ID[]) {
  return act((c) => c.matches.bulkAccept({ matchIds }), [`/studio/jobs/${jobId}/matching`, `/studio/jobs/${jobId}`]);
}

export async function splitMatches(jobId: ID, matchIds: ID[], subjectId: ID) {
  return act((c) => c.matches.split({ matchIds, subjectId }), `/studio/jobs/${jobId}/matching`);
}

export async function assignPhoto(jobId: ID, photoId: ID, subjectId: ID) {
  return act((c) => c.matches.assign({ photoId, subjectId }), `/studio/jobs/${jobId}/matching`);
}

// --- Price sheets ----------------------------------------------------------------------

export async function createPriceSheet(name: string, labId: ID) {
  return act((c) => c.priceSheets.create({ name, labId }), "/studio/price-sheets");
}

export async function updatePriceSheet(id: ID, input: PriceSheetInput) {
  return act((c) => c.priceSheets.update(id, input), ["/studio/price-sheets", `/studio/price-sheets/${id}`]);
}

export async function duplicatePriceSheet(id: ID) {
  return act((c) => c.priceSheets.duplicate(id), "/studio/price-sheets");
}

// --- Promos and passes ----------------------------------------------------------------

export async function createPromo(input: PromoInput) {
  return act((c) => c.promos.create(input), "/studio/promos");
}

export async function updatePromo(id: ID, input: Partial<PromoInput>) {
  return act((c) => c.promos.update(id, input), "/studio/promos");
}

export async function createPassOffer(input: PassOfferInput) {
  return act((c) => c.promos.createPassOffer(input), "/studio/promos");
}

export async function updatePassOffer(id: ID, input: Partial<PassOfferInput>) {
  return act((c) => c.promos.updatePassOffer(id, input), "/studio/promos");
}

// --- Orders and reports ----------------------------------------------------------------

export async function refundOrder(id: ID, input: { amountCents?: number; reason: string }) {
  return act((c) => c.orders.refund(id, input), [`/studio/orders/${id}`, "/studio/orders"]);
}

export async function reprintOrder(id: ID, itemIds: CartItem["id"][], reason: string) {
  return act((c) => c.orders.reprint(id, { itemIds, reason }), `/studio/orders/${id}`);
}

export async function reportCsv(query: { from?: string; to?: string }) {
  return act((c) => c.reports.csv(query));
}
