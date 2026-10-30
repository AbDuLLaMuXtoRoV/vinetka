"use client";

import type { JobDetail } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Alert } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useLocale } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { CalendarClock, Lock, Rocket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAction } from "@/components/use-action";
import { closeJob, extendJob, publishJob } from "@/lib/actions";
import { dateInputValue, fromDateInput } from "@/lib/dates";
import { jobsMsgs } from "@/messages/jobs";

export function JobActions({ job, stripeActive }: { job: JobDetail; stripeActive: boolean }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = jobsMsgs[locale].actions;
  const [extendOpen, setExtendOpen] = useState(false);
  const [deadline, setDeadline] = useState(dateInputValue(job.deadline));
  const [closeOpen, setCloseOpen] = useState(false);
  const missing = job.checklist.filter((c) => !c.done);

  return (
    <div className="grid gap-3 border-t border-border pt-5">
      {job.status === "draft" && !stripeActive && (
        <Alert tone="warning" title={t.stripeTitle} action={<Button size="sm" variant="secondary" asChild><Link href="/settings/payments">{t.connect}</Link></Button>}>
          {t.stripeBody}
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        {job.status === "draft" && (
          <Button
            loading={pending}
            disabled={!stripeActive}
            onClick={() => run(() => publishJob(job.id), { success: t.published, description: t.publishedBody })}
          >
            <Rocket /> {t.publish}{missing.length > 0 ? t.openItems(missing.length) : ""}
          </Button>
        )}
        {job.status !== "draft" && (
          <Modal
            open={extendOpen}
            onOpenChange={setExtendOpen}
            trigger={
              <Button variant="outline">
                <CalendarClock /> {t.extend}
              </Button>
            }
            title={t.extendTitle}
            description={job.status === "closed" ? t.extendReopen : t.extendLive}
            size="sm"
            footer={
              <>
                <Button variant="ghost" onClick={() => setExtendOpen(false)}>
                  {t.cancel}
                </Button>
                <Button
                  loading={pending}
                  disabled={!deadline}
                  onClick={() => run(() => extendJob(job.id, fromDateInput(deadline, "end")!), { success: t.extended, onSuccess: () => setExtendOpen(false) })}
                >
                  {t.saveDeadline}
                </Button>
              </>
            }
          >
            <Field label={t.newDeadline} htmlFor="extend-deadline" locale={locale}>
              <Input id="extend-deadline" type="date" value={deadline} min={dateInputValue(new Date().toISOString())} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
          </Modal>
        )}
        {job.status === "live" && (
          <Modal
            open={closeOpen}
            onOpenChange={setCloseOpen}
            trigger={
              <Button variant="ghost">
                <Lock /> {t.close}
              </Button>
            }
            title={t.closeTitle}
            description={t.closeBody}
            size="sm"
            footer={
              <>
                <Button variant="ghost" onClick={() => setCloseOpen(false)}>
                  {t.keepLive}
                </Button>
                <Button variant="danger" loading={pending} onClick={() => run(() => closeJob(job.id), { success: t.closed, onSuccess: () => setCloseOpen(false) })}>
                  {t.close}
                </Button>
              </>
            }
          />
        )}
      </div>
    </div>
  );
}
