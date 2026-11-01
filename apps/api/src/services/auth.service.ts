import { Injectable, Logger } from "@nestjs/common";
import type { MessageChannel, OtpSendResult, ParentSession, Role, StaffSession, Studio } from "@snapbell/sdk";
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
import { ApiError, badRequest, conflict, forbidden, tooMany, unauthorized } from "../common/errors";
import { RateLimiter, clientIp, nowIso, slugify } from "../common/util";
import { Repository, type MemberRow, type ParentRow } from "../store/repository";
import { MessagingService } from "./messaging.service";
import { ViewsService } from "./views.service";
import { currentLocale, err, notices, requestedLocale } from "../i18n";

const OTP_TTL_MS = 10 * 60_000;
const OTP_RESEND_MS = 30_000;
const OTP_MAX_ATTEMPTS = 5;
const HANDOFF_TTL_MS = 60_000;
const MAGIC_LINK_TTL_MS = 15 * 60_000;

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

  signup(input: { name: string; email: string; password: string; studioName: string }): { handoffCode: string; expiresInSec: number } {
    const email = input.email.trim().toLowerCase();
    if (this.repo.members.find((m) => m.email === email)) throw conflict("email_taken", err().auth.accountExists);
    let slug = slugify(input.studioName);
    for (let n = 2; this.repo.studios.find((s) => s.slug === slug); n++) slug = `${slugify(input.studioName)}-${n}`;
    const studio: Studio = {
      id: newId("stu"),
      name: input.studioName.trim(),
      slug,
      logoUrl: null,
      brandColor: "#F5B700",
      markets: [],
      albumDomain: null,
      defaultLabId: null,
      stripe: { status: "not_connected", accountId: null, payoutSchedule: "weekly", requirementsDue: [] },
      taxInfo: { legalName: input.studioName.trim(), ein: null, address: null },
      onboarding: { completed: [], done: false },
      bigOrderThresholdCents: 15_000,
      ytdSalesCents: 0,
      createdAt: nowIso(),
    };
    this.repo.studios.insert(studio);
    const member = this.repo.members.insert({
      id: newId("mem"),
      studioId: studio.id,
      name: input.name.trim(),
      email,
      role: "owner",
      status: "active",
      twoFactorEnabled: false,
      passwordHash: hashPassword(input.password),
    });
    const code = randomToken(18);
    this.repo.oneTimeTokens.insert({ id: code, kind: "handoff", memberId: member.id, expiresAt: Date.now() + HANDOFF_TTL_MS });
    return { handoffCode: code, expiresInSec: HANDOFF_TTL_MS / 1000 };
  }

  redeem(kind: "handoff" | "magic_link", code: string): StaffSession {
    const row = this.repo.oneTimeTokens.get(code);
    if (!row || row.kind !== kind || row.expiresAt < Date.now()) {
      if (row) this.repo.oneTimeTokens.remove(code);
      throw badRequest(kind === "handoff" ? "invalid_handoff" : "invalid_magic_link", err().auth.linkExpired);
    }
    this.repo.oneTimeTokens.remove(code);
    const member = this.repo.members.get(row.memberId);
    if (!member || member.status !== "active") throw unauthorized();
    return this.staffSession(member);
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
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (raw.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
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
    input: { destination: string; code: string; consent: { smsUpdates: boolean; marketing: boolean } },
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
    parent.consent = { ...parent.consent, smsUpdates: input.consent.smsUpdates, marketing: input.consent.marketing };
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
