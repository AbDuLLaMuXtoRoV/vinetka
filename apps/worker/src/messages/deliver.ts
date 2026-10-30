import { config } from "../config.js";

export interface OutboundMessage {
  messageId: string;
  channel: "sms" | "email";
  to: string;
  subject: string | null;
  body: string;
}

export type DeliveryResult = { provider: "twilio" | "postmark" | "console"; providerRef: string | null };

/** Sends one message through Twilio (SMS) or Postmark (email); logs to the console when neither is configured. */
export async function deliver(message: OutboundMessage): Promise<DeliveryResult> {
  if (message.channel === "sms" && config.twilio.accountSid && config.twilio.authToken && config.twilio.from) {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: message.to, From: config.twilio.from, Body: message.body }),
    });
    if (!res.ok) throw new Error(`Twilio responded ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { sid?: string };
    return { provider: "twilio", providerRef: json.sid ?? null };
  }
  if (message.channel === "email" && config.postmark.token) {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: { "X-Postmark-Server-Token": config.postmark.token, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ From: config.postmark.from, To: message.to, Subject: message.subject ?? "Snapbell", TextBody: message.body, MessageStream: "outbound" }),
    });
    if (!res.ok) throw new Error(`Postmark responded ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { MessageID?: string };
    return { provider: "postmark", providerRef: json.MessageID ?? null };
  }
  console.log(`[dev ${message.channel}] ${message.messageId} → ${message.to}: ${message.body}`);
  return { provider: "console", providerRef: null };
}
