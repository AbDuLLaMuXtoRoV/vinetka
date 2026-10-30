"use client";

import type { AlbumType, Job, JobInput, PriceSheetSummary } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody } from "@snapbell/ui/card";
import { Checkbox } from "@snapbell/ui/checkbox";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useLocale } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { RadioGroup } from "@snapbell/ui/radio-group";
import { Select } from "@snapbell/ui/select";
import { Switch } from "@snapbell/ui/switch";
import { useState } from "react";
import { useAction } from "@/components/use-action";
import { updateJob } from "@/lib/actions";
import { dateInputValue, fromDateInput } from "@/lib/dates";
import { useLabels } from "@/components/use-labels";
import { jobSettingsMsgs } from "@/messages/job-settings";

export function JobSettingsForm({ job, priceSheets }: { job: Job; priceSheets: PriceSheetSummary[] }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = jobSettingsMsgs[locale];
  const { albumTypes } = useLabels();
  const [name, setName] = useState(job.name);
  const [date, setDate] = useState(dateInputValue(job.date));
  const [albumType, setAlbumType] = useState<AlbumType>(job.albumType);
  const [priceSheetId, setPriceSheetId] = useState(job.priceSheetId);
  const [shipping, setShipping] = useState(job.shipping);
  const [publishAt, setPublishAt] = useState(dateInputValue(job.publishAt));
  const [deadline, setDeadline] = useState(dateInputValue(job.deadline));
  const [expiresAt, setExpiresAt] = useState(dateInputValue(job.expiresAt));
  const [protection, setProtection] = useState(job.protection);
  const [downloads, setDownloads] = useState(job.downloads);
  const [confirmAccess, setConfirmAccess] = useState(false);

  const accessChanged = albumType !== job.albumType;
  const patch: Partial<JobInput> = {
    name: name.trim(),
    date: fromDateInput(date, "noon") ?? job.date,
    albumType,
    priceSheetId,
    shipping,
    publishAt: fromDateInput(publishAt, "start"),
    deadline: fromDateInput(deadline, "end"),
    expiresAt: fromDateInput(expiresAt, "end"),
    protection,
    downloads,
  };
  const save = () => run(() => updateJob(job.id, patch), { success: t.saved, onSuccess: () => setConfirmAccess(false) });

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardBody className="grid gap-5">
          <h2 className="text-lg font-semibold">{t.basics}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t.jobName} htmlFor="set-name" locale={locale}>
              <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={t.pictureDay} htmlFor="set-date" locale={locale}>
              <Input id="set-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label={t.priceSheet} htmlFor="set-sheet" hint={job.status === "live" ? t.priceSheetLive : undefined} locale={locale}>
            <Select id="set-sheet" value={priceSheetId} onChange={(e) => setPriceSheetId(e.target.value)}>
              {priceSheets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.labName}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium">{t.delivery}</legend>
            <Checkbox id="set-home" checked={shipping.home} onCheckedChange={(v) => setShipping((s) => ({ ...s, home: v === true }))} label={t.shipHome} />
            <Checkbox id="set-pickup" checked={shipping.schoolPickup} onCheckedChange={(v) => setShipping((s) => ({ ...s, schoolPickup: v === true }))} label={t.bulk} />
          </fieldset>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-5">
          <div>
            <h2 className="text-lg font-semibold">{t.access}</h2>
            <p className="text-sm text-muted">{t.accessBody}</p>
          </div>
          <RadioGroup
            name="set-album"
            value={albumType}
            onValueChange={(v) => setAlbumType(v as AlbumType)}
            options={(Object.keys(albumTypes) as AlbumType[]).map((a) => ({ value: a, label: albumTypes[a].label, description: albumTypes[a].description }))}
          />
          {job.sharedAccessCode && (
            <p className="text-sm text-muted">
              {t.sharedCode} <span className="font-mono font-medium text-ink">{job.sharedAccessCode}</span>
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-5">
          <h2 className="text-lg font-semibold">{t.dates}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t.publish} htmlFor="set-publish" locale={locale}>
              <Input id="set-publish" type="date" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
            </Field>
            <Field label={t.deadline} htmlFor="set-deadline" locale={locale}>
              <Input id="set-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
            <Field label={t.expires} htmlFor="set-expires" locale={locale}>
              <Input id="set-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-5">
          <div>
            <h2 className="text-lg font-semibold">{t.protection}</h2>
            <p className="text-sm text-muted">{t.protectionBody}</p>
          </div>
          <Switch id="p-wm" checked={protection.watermark} onCheckedChange={(v) => setProtection((p) => ({ ...p, watermark: v }))} label={t.watermark} description={t.watermarkHint} />
          <Switch id="p-id" checked={protection.identityOverlay} onCheckedChange={(v) => setProtection((p) => ({ ...p, identityOverlay: v }))} label={t.overlay} description={t.overlayHint} />
          <Switch id="p-blur" checked={protection.blurOnFocusLoss} onCheckedChange={(v) => setProtection((p) => ({ ...p, blurOnFocusLoss: v }))} label={t.blur} description={t.blurHint} />
          <Switch id="p-dl" checked={protection.blockDownload} onCheckedChange={(v) => setProtection((p) => ({ ...p, blockDownload: v }))} label={t.blockSave} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-5">
          <h2 className="text-lg font-semibold">{t.downloads}</h2>
          <Switch id="d-dig" checked={downloads.allowDigital} onCheckedChange={(v) => setDownloads((d) => ({ ...d, allowDigital: v }))} label={t.sellDigital} />
          <Switch id="d-all" checked={downloads.allowDownloadAll} disabled={!downloads.allowDigital} onCheckedChange={(v) => setDownloads((d) => ({ ...d, allowDownloadAll: v }))} label={t.downloadAll} description={t.downloadAllHint} />
        </CardBody>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-border bg-bg/95 px-4 py-4 backdrop-blur md:mx-0 md:px-0">
        <Button size="lg" loading={pending} disabled={!name.trim()} onClick={() => (accessChanged ? setConfirmAccess(true) : save())}>
          {t.save}
        </Button>
      </div>

      <Modal
        open={confirmAccess}
        onOpenChange={setConfirmAccess}
        title={t.confirmTitle(albumTypes[albumType].label)}
        description={t.confirmDescription}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAccess(false)}>
              {t.cancel}
            </Button>
            <Button loading={pending} onClick={save}>
              {t.confirm}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {albumTypes[albumType].description} {t.confirmBody}
        </p>
      </Modal>
    </div>
  );
}
