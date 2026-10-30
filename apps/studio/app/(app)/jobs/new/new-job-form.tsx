"use client";

import type { AlbumType, Market, Organization, PriceSheetSummary, StudioBranding } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody } from "@snapbell/ui/card";
import { Checkbox } from "@snapbell/ui/checkbox";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useLocale } from "@snapbell/ui/locale";
import { RadioGroup } from "@snapbell/ui/radio-group";
import { Select } from "@snapbell/ui/select";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OrganizationDialog } from "@/components/org-form";
import { ParentPreview } from "@/components/parent-preview";
import { useAction } from "@/components/use-action";
import { createJob } from "@/lib/actions";
import { addDays, fromDateInput } from "@/lib/dates";
import { useLabels } from "@/components/use-labels";
import { jobsMsgs } from "@/messages/jobs";

export function NewJobForm({
  studio,
  markets,
  organizations: initialOrgs,
  priceSheets,
  defaultOrganizationId,
}: {
  studio: StudioBranding;
  markets: Market[];
  organizations: Organization[];
  priceSheets: PriceSheetSummary[];
  defaultOrganizationId?: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = jobsMsgs[locale].create;
  const { albumTypes, markets: marketLabels } = useLabels();
  const { run, pending } = useAction();
  const [organizations, setOrganizations] = useState(initialOrgs);
  const [organizationId, setOrganizationId] = useState(defaultOrganizationId ?? initialOrgs[0]?.id ?? "");
  const [name, setName] = useState(t.defaultName);
  const [market, setMarket] = useState<Market>(markets[0] ?? "schools");
  const [date, setDate] = useState("");
  const [albumType, setAlbumType] = useState<AlbumType>("personal");
  const [priceSheetId, setPriceSheetId] = useState(priceSheets[0]?.id ?? "");
  const [home, setHome] = useState(true);
  const [pickup, setPickup] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const org = organizations.find((o) => o.id === organizationId);
  const deadlineIso = fromDateInput(deadline, "end");
  const errors = useMemo(() => {
    const e: string[] = [];
    if (!organizationId) e.push(t.errors.org);
    if (!name.trim()) e.push(t.errors.name);
    if (!date) e.push(t.errors.date);
    if (!priceSheetId) e.push(t.errors.sheet);
    if (!home && !pickup) e.push(t.errors.delivery);
    if (deadline && date && deadline < date) e.push(t.errors.deadline);
    return e;
  }, [organizationId, name, date, priceSheetId, home, pickup, deadline, t]);

  const submit = () => {
    const pictureDay = fromDateInput(date, "noon")!;
    run(
      () =>
        createJob({
          organizationId,
          name: name.trim(),
          market,
          date: pictureDay,
          albumType,
          priceSheetId,
          shipping: { home, schoolPickup: pickup },
          publishAt: fromDateInput(publishAt, "start"),
          deadline: deadlineIso,
          expiresAt: fromDateInput(expiresAt, "end") ?? (deadlineIso ? addDays(deadlineIso, 90) : null),
        }),
      { success: t.created, description: t.createdBody, onSuccess: (job) => router.push(`/jobs/${job.id}/roster`) },
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="grid gap-6">
        <Card>
          <CardBody className="grid gap-5">
            <h2 className="text-lg font-semibold">{t.whoWhen}</h2>
            <Field label={t.organization} htmlFor="job-org" locale={locale}>
              <div className="flex gap-2">
                <Select id="job-org" wrapperClassName="flex-1" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                  {organizations.length === 0 && <option value="">{t.addOrgFirst}</option>}
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
                <OrganizationDialog
                  trigger={
                    <Button variant="outline" aria-label={t.newOrg}>
                      <Plus /> {t.newOrgShort}
                    </Button>
                  }
                  onSaved={(o) => {
                    setOrganizations((list) => [...list, o]);
                    setOrganizationId(o.id);
                  }}
                />
              </div>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t.jobName} htmlFor="job-name" locale={locale}>
                <Input id="job-name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label={t.market} htmlFor="job-market" locale={locale}>
                <Select id="job-market" value={market} onChange={(e) => setMarket(e.target.value as Market)}>
                  {Object.entries(marketLabels).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t.pictureDay} htmlFor="job-date" locale={locale}>
              <Input id="job-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="md:max-w-xs" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="grid gap-5">
            <h2 className="text-lg font-semibold">{t.albumType}</h2>
            <RadioGroup
              name="album"
              value={albumType}
              onValueChange={(v) => setAlbumType(v as AlbumType)}
              variant="cards"
              options={(Object.keys(albumTypes) as AlbumType[]).map((a) => ({ value: a, label: albumTypes[a].label, description: albumTypes[a].description }))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="grid gap-5">
            <h2 className="text-lg font-semibold">{t.pricesDelivery}</h2>
            <Field
              label={t.priceSheet}
              htmlFor="job-sheet"
              locale={locale}
              hint={
                <>
                  {t.manageSheetsBefore}{" "}
                  <Link href="/price-sheets" className="underline">
                    {t.manageSheetsLink}
                  </Link>
                  .
                </>
              }
            >
              <Select id="job-sheet" value={priceSheetId} onChange={(e) => setPriceSheetId(e.target.value)}>
                {priceSheets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.labName}
                  </option>
                ))}
              </Select>
            </Field>
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-medium">{t.delivery}</legend>
              <Checkbox id="ship-home" checked={home} onCheckedChange={(v) => setHome(v === true)} label={t.shipHome} description={t.shipHomeHint} />
              <Checkbox id="ship-bulk" checked={pickup} onCheckedChange={(v) => setPickup(v === true)} label={t.shipBulk} description={t.shipBulkHint} />
            </fieldset>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="grid gap-5">
            <h2 className="text-lg font-semibold">{t.dates}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={t.publish} htmlFor="job-publish" hint={t.publishHint} locale={locale}>
                <Input id="job-publish" type="date" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
              </Field>
              <Field label={t.deadline} htmlFor="job-deadline" hint={t.deadlineHint} locale={locale}>
                <Input id="job-deadline" type="date" value={deadline} min={date || undefined} onChange={(e) => setDeadline(e.target.value)} />
              </Field>
              <Field label={t.expires} htmlFor="job-expires" hint={t.expiresHint} locale={locale}>
                <Input id="job-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </Field>
            </div>
          </CardBody>
        </Card>

        {errors.length > 0 && (
          <ul className="grid gap-1 text-sm text-muted" aria-live="polite">
            {errors.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" asChild>
            <Link href="/jobs">{t.cancel}</Link>
          </Button>
          <Button size="lg" disabled={errors.length > 0} loading={pending} onClick={submit}>
            {t.submit}
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <ParentPreview studio={studio} organizationName={org?.name ?? ""} jobName={name} albumType={albumType} deadline={deadlineIso} watermark />
      </aside>
    </div>
  );
}
