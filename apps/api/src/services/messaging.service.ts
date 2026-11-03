import { Injectable, Logger } from "@nestjs/common";
import type { MessageChannel, MessageLog } from "@snapbell/sdk";
import { config } from "../config";
import { newId } from "../common/crypto";
import { nowIso } from "../common/util";
import { Repository } from "../store/repository";
import { QueueService } from "./queue.service";
import { currentLocale, notices } from "../i18n";

export interface SendInput {
  studioId: string | null;
  channel: MessageChannel;
  to: string;
  template: string;
  body: string;
  subject?: string;
  jobId?: string | null;
  orderId?: string | null;
  /**
   * transactional: codes, receipts, shipping updates (always sent, any hour).
   * automated: gallery/deadline reminders (SMS needs the parent's opt-in; quiet hours apply).
   * marketing: promotions (needs marketing opt-in; quiet hours apply).
   */
  kind: "transactional" | "automated" | "marketing";
  parentId?: string | null;
  /** What to store in the log instead of the body (e.g. never store one-time codes). */
  logBody?: string;
}

const STOP_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
const START_WORDS = ["START", "UNSTOP", "YES"];

/** Local hour in the quiet-hours time zone (QUIET_HOURS_TZ, default Asia/Tashkent). */
function localHour(date: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(date);
  return Number(h) % 24;
}

/** No automated or marketing texts between 21:00 and 08:00 local time. */
export function inQuietHours(date = new Date(), timeZone = config.quietHoursTimeZone): boolean {
  const h = localHour(date, timeZone);
  return h >= 21 || h < 8;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger("Messaging");

  constructor(
    private readonly repo: Repository,
    private readonly queue: QueueService,
  ) {}

  normalize(to: string): string {
    return to.includes("@") ? to.trim().toLowerCase() : to.replace(/[^\d+]/g, "");
  }

  isSuppressed(to: string): boolean {
    return !!this.repo.suppressions.get(this.normalize(to));
  }

  suppress(to: string, channel: MessageChannel, reason: string): void {
    const id = this.normalize(to);
    this.repo.suppressions.insert({ id, channel, reason, createdAt: nowIso() });
  }

  unsuppress(to: string): void {
    this.repo.suppressions.remove(this.normalize(to));
  }

  /** Handles an inbound SMS keyword. Returns the reply to send, if any. */
  inboundSms(from: string, text: string): string | null {
    const word = text.trim().toUpperCase();
    const number = this.normalize(from);
    const t = notices(this.repo.parents.find((p) => p.phone === number)?.locale ?? "en");
    if (STOP_WORDS.includes(word)) {
      this.suppress(from, "sms", "STOP keyword");
      return t.inbound.stopped;
    }
    if (START_WORDS.includes(word)) {
      this.unsuppress(from);
      return t.inbound.started;
    }
    return null;
  }

  send(input: SendInput): MessageLog {
    const to = this.normalize(input.to);
    const parent = input.parentId ? this.repo.parents.get(input.parentId) : undefined;
    // Automated and marketing texts carry the opt-out line, in the recipient's language.
    if (input.channel === "sms" && input.kind !== "transactional") {
      input = { ...input, body: `${input.body} ${notices(parent?.locale ?? currentLocale()).smsOptOut}` };
    }
    let status: MessageLog["status"] = "sent";

    if (this.isSuppressed(to)) status = "suppressed";
    else if (input.kind === "marketing" && !parent?.consent.marketing) status = "suppressed";
    else if (input.kind === "automated" && input.channel === "sms" && parent && !parent.consent.smsUpdates) status = "suppressed";
    else if (input.channel === "sms" && input.kind !== "transactional" && inQuietHours()) status = "queued";

    const log: MessageLog = {
      id: newId("msg"),
      studioId: input.studioId,
      channel: input.channel,
      to,
      template: input.template,
      body: input.logBody ?? input.body,
      status,
      jobId: input.jobId ?? null,
      orderId: input.orderId ?? null,
      createdAt: nowIso(),
    };
    this.repo.messages.insert(log);

    if (status === "sent") void this.deliver(log, input);
    return log;
  }

  private async deliver(log: MessageLog, input: SendInput): Promise<void> {
    const payload = { messageId: log.id, channel: input.channel, to: log.to, subject: input.subject ?? null, body: input.body };
    try {
      if (await this.queue.enqueue("messages", payload)) return;
      if (input.channel === "sms" && config.twilio.accountSid && config.twilio.authToken && config.twilio.from) {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: log.to, From: config.twilio.from, Body: input.body }),
        });
        if (!res.ok) throw new Error(`Twilio ${res.status}`);
        return;
      }
      if (input.channel === "email" && config.postmark.token) {
        const res = await fetch("https://api.postmarkapp.com/email", {
          method: "POST",
          headers: { "X-Postmark-Server-Token": config.postmark.token, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ From: config.postmark.from, To: log.to, Subject: input.subject ?? "Snapbell", TextBody: input.body, MessageStream: "outbound" }),
        });
        if (!res.ok) throw new Error(`Postmark ${res.status}`);
        return;
      }
      this.logger.log(`[dev ${input.channel}] to ${log.to}: ${input.body}`);
    } catch (err) {
      this.logger.warn(`Delivery failed for ${log.id}: ${(err as Error).message}`);
      this.repo.messages.update(log.id, { status: "failed" });
    }
  }
}
