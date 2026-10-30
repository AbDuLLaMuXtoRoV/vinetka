"use client";

import type { Job, ScheduledMessage } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody } from "@snapbell/ui/card";
import { Timeline } from "@snapbell/ui/data";
import { Alert, EmptyState } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input, Textarea } from "@snapbell/ui/input";
import { useFormatters, useLocale } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { Select } from "@snapbell/ui/select";
import { Switch } from "@snapbell/ui/switch";
import { FileDown, Megaphone, Pencil, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAction } from "@/components/use-action";
import { testScheduledMessage, updateScheduledMessage } from "@/lib/actions";
import { dateTimeInputValue, fromDateTimeInput } from "@/lib/dates";
import { useLabels } from "@/components/use-labels";
import { jobMarketingMsgs } from "@/messages/job-marketing";

// GSM-7 basic alphabet: anything outside it (Cyrillic, ʻ in Uzbek, emoji) switches the SMS to UCS-2.
const GSM7 = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/;

/** Characters and segment count, accounting for the shorter UCS-2 segments. */
function smsSegments(body: string): { chars: number; segments: number; unicode: boolean } {
  const unicode = !GSM7.test(body);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  const chars = [...body].length;
  return { chars, unicode, segments: chars <= single ? 1 : Math.ceil(chars / multi) };
}

export function MessagesClient({ job, messages, defaultTestTo }: { job: Job; messages: ScheduledMessage[]; defaultTestTo: string }) {
  const { run, pending } = useAction();
  const t = jobMarketingMsgs[useLocale()];
  const fmt = useFormatters();
  const { messageKinds, channels } = useLabels();
  const [editing, setEditing] = useState<ScheduledMessage | null>(null);
  const [testing, setTesting] = useState<ScheduledMessage | null>(null);
  const [testTo, setTestTo] = useState(defaultTestTo);
  const now = Date.now();
  const sorted = [...messages].sort((a, b) => (a.sendAt ? new Date(a.sendAt).getTime() : Infinity) - (b.sendAt ? new Date(b.sendAt).getTime() : Infinity));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="grid gap-4">
        <Alert tone="info" title={t.bannerTitle}>
          {t.bannerBody}
        </Alert>
        {sorted.length === 0 ? (
          <EmptyState icon={<Megaphone />} title={t.emptyTitle} description={t.emptyBody} />
        ) : (
          <ul className="grid gap-3">
            {sorted.map((m) => {
              const sent = m.sendAt ? new Date(m.sendAt).getTime() < now : false;
              return (
                <li key={m.id}>
                  <Card>
                    <CardBody className="grid gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium">{messageKinds[m.kind]}</h3>
                            <Badge tone="outline">{channels[m.channel]}</Badge>
                            {sent ? <Badge tone="success">{t.sentTo(m.sentCount)}</Badge> : !m.enabled ? <Badge>{t.off}</Badge> : null}
                          </div>
                          <p className="text-xs text-muted">{m.sendAt ? (sent ? t.sentAt(fmt.dateTime(m.sendAt)) : t.sendsAt(fmt.dateTime(m.sendAt))) : t.onShip}</p>
                        </div>
                        <Switch id={`en-${m.id}`} checked={m.enabled} disabled={sent} aria-label={t.enabled(messageKinds[m.kind])} onCheckedChange={(v) => run(() => updateScheduledMessage(job.id, m.id, { enabled: v }), { success: v ? t.on : t.offToast })} />
                      </div>
                      <div className="max-w-md rounded-[18px] rounded-bl-[4px] bg-sunken px-4 py-2.5 text-sm">{m.body}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" disabled={sent} onClick={() => setEditing(m)}>
                          <Pencil /> {t.edit}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setTesting(m)}>
                          <Send /> {t.sendTest}
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <aside className="grid content-start gap-4">
        <Card>
          <CardBody className="grid gap-4">
            <h2 className="font-semibold">{t.schedule}</h2>
            <Timeline
              locale={fmt.locale}
              steps={sorted
                .filter((m) => m.enabled && m.sendAt)
                .map((m) => {
                  const at = new Date(m.sendAt!).getTime();
                  return { label: messageKinds[m.kind], detail: fmt.dateTime(m.sendAt!), state: at < now ? ("done" as const) : ("upcoming" as const) };
                })}
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="grid gap-3">
            <h2 className="font-semibold">{t.flyers}</h2>
            <p className="text-sm text-muted">{t.flyersBody}</p>
            <Button variant="secondary" asChild>
              <Link href={`/jobs/${job.id}/roster/print?view=flyer`}>
                <FileDown /> {t.flyerDownload}
              </Link>
            </Button>
          </CardBody>
        </Card>
      </aside>

      {editing && (
        <EditMessage
          key={editing.id}
          message={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(patch) => run(() => updateScheduledMessage(job.id, editing.id, patch), { success: t.saved, onSuccess: () => setEditing(null) })}
        />
      )}

      <Modal
        open={testing !== null}
        onOpenChange={(o) => !o && setTesting(null)}
        title={t.testTitle}
        description={t.testBody}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTesting(null)}>
              {t.cancel}
            </Button>
            <Button
              loading={pending}
              disabled={!testTo.trim()}
              onClick={() => testing && run(() => testScheduledMessage(job.id, testing.id, testTo.trim()), { success: t.testSent, description: t.check(testTo), refresh: false, onSuccess: () => setTesting(null) })}
            >
              <Send /> {t.sendTest}
            </Button>
          </>
        }
      >
        <Field label={t.phoneOrEmail} htmlFor="test-to" locale={fmt.locale}>
          <Input id="test-to" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}

function EditMessage({
  message,
  onSave,
  onClose,
  pending,
}: {
  message: ScheduledMessage;
  onSave: (patch: Partial<Pick<ScheduledMessage, "sendAt" | "subject" | "body" | "channel">>) => void;
  onClose: () => void;
  pending: boolean;
}) {
  const [subject, setSubject] = useState(message.subject);
  const [body, setBody] = useState(message.body);
  const [sendAt, setSendAt] = useState(dateTimeInputValue(message.sendAt));
  const [channel, setChannel] = useState(message.channel);
  const locale = useLocale();
  const t = jobMarketingMsgs[locale];
  const { messageKinds } = useLabels();
  const sms = smsSegments(body);

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={t.editTitle(messageKinds[message.kind])}
      description={t.placeholders}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button loading={pending} disabled={!body.trim()} onClick={() => onSave({ subject, body, channel, ...(message.sendAt ? { sendAt: fromDateTimeInput(sendAt) } : {}) })}>
            {t.save}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.channel} htmlFor="msg-channel" locale={locale}>
            <Select id="msg-channel" value={channel} onChange={(e) => setChannel(e.target.value as ScheduledMessage["channel"])}>
              <option value="both">{t.both}</option>
              <option value="sms">{t.smsOnly}</option>
              <option value="email">{t.emailOnly}</option>
            </Select>
          </Field>
          {message.sendAt && (
            <Field label={t.sendAt} htmlFor="msg-at" locale={locale}>
              <Input id="msg-at" type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
            </Field>
          )}
        </div>
        {channel !== "sms" && (
          <Field label={t.subject} htmlFor="msg-subject" locale={locale}>
            <Input id="msg-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
        )}
        <Field label={t.message} htmlFor="msg-body" locale={locale} hint={channel !== "email" ? t.smsHint(sms.chars, sms.segments, sms.unicode) : undefined}>
          <Textarea id="msg-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
