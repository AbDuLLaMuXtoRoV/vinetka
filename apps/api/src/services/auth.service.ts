import { Injectable, Logger } from "@nestjs/common";
import {
  toE164,
  type AccountSetupInfo,
  type MessageChannel,
  type OtpSendResult,
  type ParentSession,
  type Role,
  type SetupLink,
  type StaffSession,
  type Studio,
} from "@snapbell/sdk";
import type { Request } from "express";
import { config, twilioVerifyEnabled } from "../config";
import {
  hashPassword,
  hmac,
  newId,
  randomDigits,
  randomToken,
  safeEqual,
  signToken,
  verifyPassword,
  verifyToken,
  type TokenPayload,
} from "../common/crypto";
import { ApiError, badRequest, forbidden, tooMany, unauthorized } from "../common/errors";
import { RateLimiter, clientIp, nowIso } from "../common/util";
import { Repository, type MemberRow, type ParentRow, type SetupTokenRow } from "../store/repository";
import { MessagingService } from "./messaging.service";
import { ViewsService } from "./views.service";
import { currentLocale, err, notices, requestedLocale } from "../i18n";

const OTP_TTL_MS = 10 * 60_000;
const OTP_RESEND_MS = 30_000;
const OTP_MAX_ATTEMPTS = 5;
const MAGIC_LINK_TTL_MS = 15 * 60_000;
const SETUP_LINK_TTL_MS = 7 * 24 * 60 * 60_000;
const PARENT_HANDOFF_TTL_MS = 60_000;

/** Setup tokens are looked up by HMAC so a leaked table can't be used to set passwords. */
const setupTokenHash = (token: string) => hmac(`setup:${token}`);
const handoffHash = (code: string) => hmac(`handoff:${code}`);

/** Roles kept away from money: reports, payouts, payment settings, refunds, team management. */
export const MANAGERS_ONLY = { deny: ["photographer"] as Role[] };

export interface StaffContext {
  member: MemberRow;
  studio: Studio;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger("Auth");
  private readonly loginLimiter = new RateLimiter(20, 60_000, () => err().rate.login);
  private readonly otpSendLimiter = new RateLimiter(10, 10 * 60_000, () => err().rate.otpSend);
  private readonly otpVerifyLimiter = new RateLimiter(20, 10 * 60_000, () => err().rate.otpVerify);
  private readonly handoffLimiter = new RateLimiter(30, 10 * 60_000, () => err().rate.login);

  constructor(
    private readonly repo: Repository,
    private readonly views: ViewsService,
    private readonly messaging: MessagingService,
  ) {}

  // --- Sessions ---------------------------------------------------------------------

  session(req: Request): TokenPayload | null {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    return verifyToken(header.slice(7).trim());
  }

  staff(req: Request, opts: { deny?: Role[] } = {}): StaffContext {
    const s = this.session(req);
    if (!s || s.k !== "staff") throw unauthorized();
    const member = this.repo.members.get(s.sub);
    if (!member || member.status !== "active") throw unauthorized(err().auth.sessionEnded);
    const studio = this.repo.studios.get(member.studioId);
    if (!studio) throw unauthorized();
    if (opts.deny?.includes(member.role)) throw forbidden(err().auth.roleDenied(member.role));
    return { member, studio };
  }

  parent(req: Request): ParentRow {
    const s = this.session(req);
    if (!s || s.k !== "parent") throw unauthorized(err().auth.verifyToContinue);
    const parent = this.repo.parents.get(s.sub);
    if (!parent) throw unauthorized(err().auth.verifyToContinue);
    this.rememberLocale(parent);
    return parent;
  }

  optionalParent(req: Request): ParentRow | null {
    const s = this.session(req);
    const parent = s?.k === "parent" ? (this.repo.parents.get(s.sub) ?? null) : null;
    if (parent) this.rememberLocale(parent);
    return parent;
  }

  /** Parents get texts and emails in the language their browser last asked for. */
  private rememberLocale(parent: ParentRow): void {
    const wanted = requestedLocale();
    if (wanted && parent.locale !== wanted) parent.locale = wanted;
  }

  admin(req: Request): { email: string } {
    const s = this.session(req);
    if (!s || s.k !== "admin" || !this.repo.admins.find((a) => a.email === s.sub)) throw unauthorized(err().auth.adminRequired);
    return { email: s.sub };
  }

  me(req: Request) {
    const s = this.session(req);
    if (s?.k === "staff") {
      const { member, studio } = this.staff(req);
      return { kind: "staff" as const, member: this.views.member(member), studio };
    }
    if (s?.k === "parent") return { kind: "parent" as const, parent: this.views.parent(this.parent(req)) };
    if (s?.k === "admin") return { kind: "admin" as const, email: this.admin(req).email };
    throw unauthorized();
  }

  private staffSession(member: MemberRow): StaffSession {
    const studio = this.repo.studios.get(member.studioId)!;
    return { token: signToken({ k: "staff", sub: member.id, sid: studio.id }), member: this.views.member(member), studio };
  }

  // --- Studio staff -------------------------------------------------------------------

  login(req: Request, email: string, password: string): StaffSession {
    this.loginLimiter.hit(clientIp(req));
    const member = this.repo.members.find((m) => m.email === email.trim().toLowerCase());
    if (!member || member.status !== "active" || !verifyPassword(password, member.passwordHash)) {
      throw new ApiError(401, "invalid_credentials", err().auth.invalidCredentials);
    }
    return this.staffSession(member);
  }

  redeemMagicLink(token: string): StaffSession {
    const row = this.repo.oneTimeTokens.get(token);
    if (!row || row.kind !== "magic_link" || row.expiresAt < Date.now()) {
      if (row) this.repo.oneTimeTokens.remove(token);
      throw badRequest("invalid_magic_link", err().auth.linkExpired);
    }
    this.repo.oneTimeTokens.remove(token);
    const member = this.repo.members.get(row.memberId);
    if (!member || member.status !== "active") throw unauthorized();
    return this.staffSession(member);
  }

  // --- Account setup (studios are created by Snapbell staff; no self-signup) ------------

  /**
   * One-time "choose your password" link for an invited member (a new studio
   * owner or an invited team member). Only a hash is stored, and any older link
   * for the same member stops working.
   */
  issueSetupLink(member: MemberRow): SetupLink {
    for (const old of this.repo.setupTokens.filter((t) => t.memberId === member.id)) this.repo.setupTokens.remove(old.id);
    const token = randomToken(32);
    const expiresAt = Date.now() + SETUP_LINK_TTL_MS;
    this.repo.setupTokens.insert({ id: setupTokenHash(token), memberId: member.id, expiresAt, usedAt: null, createdAt: Date.now() });
    return { url: `${config.studioUrl}/setup?token=${encodeURIComponent(token)}`, expiresAt: new Date(expiresAt).toISOString() };
  }

  /** Validates a setup token: 404 when unknown or used, 410 when expired. */
  private setupToken(token: string): { row: SetupTokenRow; member: MemberRow } {
    const row = this.repo.setupTokens.get(setupTokenHash(token));
    const member = row ? this.repo.members.get(row.memberId) : undefined;
    if (!row || row.usedAt !== null || !member || member.status !== "invited") {
      throw new ApiError(404, "setup_link_invalid", err().auth.setupLinkInvalid);
    }
    if (row.expiresAt < Date.now()) throw new ApiError(410, "setup_link_expired", err().auth.setupLinkExpired);
    return { row, member };
  }

  setupInfo(token: string): AccountSetupInfo {
    const { row, member } = this.setupToken(token);
    const studio = this.repo.studios.get(member.studioId);
    return {
      name: member.name,
      email: member.email,
      studioName: studio?.name ?? "",
      role: member.role,
      expiresAt: new Date(row.expiresAt).toISOString(),
    };
  }

  completeSetup(req: Request, token: string, password: string): StaffSession {
    this.loginLimiter.hit(clientIp(req));
    const { row, member } = this.setupToken(token);
    row.usedAt = Date.now();
    member.passwordHash = hashPassword(password);
    member.status = "active";
    for (const other of this.repo.setupTokens.filter((t) => t.memberId === member.id && t.id !== row.id)) this.repo.setupTokens.remove(other.id);
    return this.staffSession(member);
  }

  // --- Parent handoff between sites (main site → shop) -----------------------------------

  /**
   * One-time code for a signed-in parent moving to another Snapbell site. The
   * sites live on different domains, so the session can't be shared as a cookie.
   */
  issueParentHandoff(req: Request): { code: string; expiresInSec: number } {
    const parent = this.parent(req);
    const now = Date.now();
    for (const old of this.repo.parentHandoffs.filter((h) => h.expiresAt < now || h.usedAt !== null)) this.repo.parentHandoffs.remove(old.id);
    const code = randomToken(24);
    this.repo.parentHandoffs.insert({ id: handoffHash(code), parentId: parent.id, expiresAt: now + PARENT_HANDOFF_TTL_MS, usedAt: null });
    return { code, expiresInSec: PARENT_HANDOFF_TTL_MS / 1000 };
  }

  /** Exchanges a handoff code for a fresh parent session. Consent is never touched. */
  redeemParentHandoff(req: Request, code: string): ParentSession {
    this.handoffLimiter.hit(clientIp(req));
    const row = this.repo.parentHandoffs.get(handoffHash(code));
    const parent = row ? this.repo.parents.get(row.parentId) : undefined;
    if (!row || row.usedAt !== null || !parent) throw new ApiError(404, "handoff_invalid", err().auth.handoffInvalid);
    if (row.expiresAt < Date.now()) {
      this.repo.parentHandoffs.remove(row.id);
      throw new ApiError(410, "handoff_expired", err().auth.handoffExpired);
    }
    row.usedAt = Date.now();
    this.rememberLocale(parent);
    return { token: signToken({ k: "parent", sub: parent.id }), parent: this.views.parent(parent) };
  }

  magicLink(email: string): { sent: true; devLink: string | null } {
    const member = this.repo.members.find((m) => m.email === email.trim().toLowerCase() && m.status === "active");
    if (!member) return { sent: true, devLink: null };
    const token = randomToken(24);
    this.repo.oneTimeTokens.insert({ id: token, kind: "magic_link", memberId: member.id, expiresAt: Date.now() + MAGIC_LINK_TTL_MS });
    const link = `${config.studioUrl}/auth/magic?token=${encodeURIComponent(token)}`;
    this.messaging.send({
      studioId: member.studioId,
      channel: "email",
      to: member.email,
      template: "magic_link",
      subject: notices().magicLink.subject,
      body: notices().magicLink.body(link),
      logBody: notices().magicLink.logBody,
      kind: "transactional",
    });
    return { sent: true, devLink: config.production && !config.demoMode ? null : link };
  }

  // --- Parents: one-time codes ------------------------------------------------------------

  normalizeDestination(channel: MessageChannel, raw: string): string {
    if (channel === "email") {
      const email = raw.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest("invalid_destination", err().auth.invalidEmail);
      return email;
    }
    // National numbers are Uzbek (+998); other countries must be written with "+".
    const e164 = toE164(raw);
    if (e164) return e164;
    throw badRequest("invalid_destination", err().auth.invalidPhone);
  }

  async sendOtp(req: Request, input: { destination: string; channel: MessageChannel }): Promise<OtpSendResult> {
    this.otpSendLimiter.hit(clientIp(req));
    const destination = this.normalizeDestination(input.channel, input.destination);
    const existing = this.repo.otps.get(destination);
    if (existing && Date.now() - existing.sentAt < OTP_RESEND_MS) {
      const wait = Math.ceil((OTP_RESEND_MS - (Date.now() - existing.sentAt)) / 1000);
      throw tooMany(err().rate.otpResend(wait), wait);
    }

    let code: string | null = null;
    if (twilioVerifyEnabled()) {
      // Twilio Verify has English and Russian templates; Uzbek falls back to English.
      const locale = currentLocale();
      await this.twilioVerify("Verifications", { To: destination, Channel: input.channel === "email" ? "email" : "sms", ...(locale === "uz" ? {} : { Locale: locale }) });
    } else {
      code = randomDigits(6);
      this.messaging.send({
        studioId: null,
        channel: input.channel,
        to: destination,
        template: "otp",
        subject: notices().otp.subject,
        body: notices().otp.body(code),
        logBody: notices().otp.logBody,
        kind: "transactional",
      });
    }
    this.repo.otps.insert({
      id: destination,
      channel: input.channel,
      codeHash: code ? hmac(`otp:${destination}:${code}`) : null,
      attempts: 0,
      sentAt: Date.now(),
      expiresAt: Date.now() + OTP_TTL_MS,
    });
    return {
      destination,
      channel: input.channel,
      resendAfterSec: OTP_RESEND_MS / 1000,
      devCode: config.production && !config.demoMode ? null : code,
    };
  }

  async verifyOtp(
    req: Request,
    input: { destination: string; code: string; consent?: { smsUpdates: boolean; marketing: boolean }; name?: string },
  ): Promise<ParentSession> {
    this.otpVerifyLimiter.hit(clientIp(req));
    const channel: MessageChannel = input.destination.includes("@") ? "email" : "sms";
    const destination = this.normalizeDestination(channel, input.destination);
    const otp = this.repo.otps.get(destination);
    if (!otp || otp.expiresAt < Date.now()) {
      if (otp) this.repo.otps.remove(destination);
      throw badRequest("code_expired", err().auth.codeExpired);
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      this.repo.otps.remove(destination);
      throw tooMany(err().rate.otpLocked, 0);
    }

    const code = input.code.replace(/\D/g, "");
    const ok = otp.codeHash
      ? safeEqual(otp.codeHash, hmac(`otp:${destination}:${code}`))
      : (await this.twilioVerify("VerificationCheck", { To: destination, Code: code }))?.status === "approved";
    if (!ok) {
      otp.attempts += 1;
      throw badRequest("wrong_code", err().auth.wrongCode(OTP_MAX_ATTEMPTS - otp.attempts), { attemptsLeft: OTP_MAX_ATTEMPTS - otp.attempts });
    }
    this.repo.otps.remove(destination);

    let parent = this.repo.parents.find((p) => (channel === "email" ? p.email === destination : p.phone === destination));
    if (!parent) {
      parent = this.repo.parents.insert({
        id: newId("par"),
        name: null,
        email: channel === "email" ? destination : null,
        phone: channel === "sms" ? destination : null,
        locale: currentLocale(),
        consent: { smsUpdates: false, marketing: false, biometricsAt: null },
        notifications: { orderUpdates: true, galleryReady: true, deadlineReminders: true, channel },
        deletionRequestedAt: null,
        exportRequestedAt: null,
        createdAt: nowIso(),
      });
    }
    // Only change consent when the form asked for it; a returning parent keeps earlier choices.
    if (input.consent) parent.consent = { ...parent.consent, smsUpdates: input.consent.smsUpdates, marketing: input.consent.marketing };
    // Shop sign-up sends the parent's name with the code.
    const name = input.name?.trim();
    if (name) parent.name = name;
    parent.locale = currentLocale();
    return { token: signToken({ k: "parent", sub: parent.id }), parent: this.views.parent(parent) };
  }

  private async twilioVerify(path: "Verifications" | "VerificationCheck", form: Record<string, string>): Promise<{ status?: string } | null> {
    const { accountSid, authToken, verifyServiceSid } = config.twilio;
    const res = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(form),
    });
    if (!res.ok) {
      this.logger.warn(`Twilio Verify ${path} failed: ${res.status}`);
      if (path === "Verifications") throw new ApiError(502, "otp_unavailable", err().auth.otpUnavailable);
      return null;
    }
    return (await res.json()) as { status?: string };
  }

  // --- Internal admin -------------------------------------------------------------------

  adminLogin(req: Request, email: string, password: string): { token: string; email: string } {
    this.loginLimiter.hit(clientIp(req));
    const admin = this.repo.admins.find((a) => a.email === email.trim().toLowerCase());
    if (!admin || !verifyPassword(password, admin.passwordHash)) throw new ApiError(401, "invalid_credentials", err().auth.invalidCredentials);
    return { token: signToken({ k: "admin", sub: admin.email }), email: admin.email };
  }
}
