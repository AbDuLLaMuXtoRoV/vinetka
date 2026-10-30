"use client";

import { parseMoney, type Formatters, type JobStatus, type PassOffer, type Promo, type PromoKind } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@snapbell/ui/disclosure";
import { EmptyState } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useFormatters, useLocale, useMessages } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { Select } from "@snapbell/ui/select";
import { Switch } from "@snapbell/ui/switch";
import { Plus, Ticket, TicketPercent } from "lucide-react";
import { useState } from "react";
import { useAction } from "@/components/use-action";
import { createPassOffer, createPromo, updatePassOffer, updatePromo } from "@/lib/actions";
import { dateInputValue, fromDateInput } from "@/lib/dates";
import { useLabels } from "@/components/use-labels";
import { promosMsgs } from "@/messages/promos";

type JobOption = { id: string; name: string; date: string; status: JobStatus };
type T = (typeof promosMsgs)["en"];

function promoValue(p: Pick<Promo, "kind" | "value">, t: T, fmt: Formatters) {
  return p.kind === "percent" ? t.off(fmt.percent(p.value / 10_000, 1)) : p.kind === "fixed" ? t.off(fmt.money(p.value)) : t.freeShipping;
}

function window_(start: string | null, end: string | null, t: T, fmt: Formatters) {
  const d = (iso: string) => fmt.date(iso, { month: "short", day: "numeric" });
  if (!start && !end) return t.always;
  if (start && end) return `${d(start)} – ${d(end)}`;
  return end ? t.until(d(end)) : t.from(d(start!));
}

export function PromosClient({ promos, offers, jobs }: { promos: Promo[]; offers: PassOffer[]; jobs: JobOption[] }) {
  const { run } = useAction();
  const t = useMessages(promosMsgs);
  const fmt = useFormatters();
  return (
    <Tabs defaultValue="codes">
      <TabsList>
        <TabsTrigger value="codes">{t.codesTab(promos.length)}</TabsTrigger>
        <TabsTrigger value="passes">{t.passTab(offers.length)}</TabsTrigger>
      </TabsList>

      <TabsContent value="codes" className="grid gap-4">
        <div className="flex justify-end">
          <NewPromo jobs={jobs} />
        </div>
        {promos.length === 0 ? (
          <EmptyState icon={<TicketPercent />} title={t.noCodes} description={t.noCodesBody} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>{t.colCode}</TH>
                <TH>{t.colDiscount}</TH>
                <TH>{t.colDates}</TH>
                <TH>{t.colAppliesTo}</TH>
                <TH align="right">{t.colUsed}</TH>
                <TH>{t.colActive}</TH>
              </tr>
            </THead>
            <TBody>
              {promos.map((p) => {
                const expired = p.endsAt ? new Date(p.endsAt) < new Date() : false;
                return (
                  <TR key={p.id}>
                    <TD className="font-mono font-semibold">{p.code}</TD>
                    <TD>
                      {promoValue(p, t, fmt)}
                      {p.minSubtotalCents > 0 && <span className="block text-xs text-muted">{t.over(fmt.money(p.minSubtotalCents))}</span>}
                    </TD>
                    <TD className="text-muted">
                      {window_(p.startsAt, p.endsAt, t, fmt)} {expired && <Badge tone="outline">{t.ended}</Badge>}
                    </TD>
                    <TD className="text-muted">{p.jobIds.length === 0 ? t.allJobs : p.jobIds.map((id) => jobs.find((j) => j.id === id)?.name ?? id).join(", ")}</TD>
                    <TD align="right">
                      {p.usageCount}
                      {p.usageLimit !== null && <span className="text-muted"> / {p.usageLimit}</span>}
                    </TD>
                    <TD>
                      <Switch id={`promo-${p.id}`} aria-label={t.activeAria(p.code)} checked={p.active} onCheckedChange={(v) => run(() => updatePromo(p.id, { active: v }), { success: v ? t.turnedOn(p.code) : t.turnedOff(p.code) })} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </TabsContent>

      <TabsContent value="passes" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-muted">{t.passIntro}</p>
          <NewPassOffer jobs={jobs.filter((j) => j.status !== "closed")} />
        </div>
        {offers.length === 0 ? (
          <EmptyState icon={<Ticket />} title={t.noOffers} description={t.noOffersBody} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>{t.colJob}</TH>
                <TH>{t.colAmounts}</TH>
                <TH>{t.colBonus}</TH>
                <TH>{t.colEnds}</TH>
                <TH align="right">{t.colSold}</TH>
                <TH>{t.colActive}</TH>
              </tr>
            </THead>
            <TBody>
              {offers.map((o) => (
                <TR key={o.id}>
                  <TD className="font-medium">{jobs.find((j) => j.id === o.jobId)?.name ?? o.jobName}</TD>
                  <TD>{o.amountsCents.map((a) => fmt.money(a, { whole: true })).join(" · ")}</TD>
                  <TD>{o.bonusBps ? `+${fmt.percent(o.bonusBps / 10_000, 1)}` : "—"}</TD>
                  <TD className="text-muted">{fmt.date(o.endsAt)}</TD>
                  <TD align="right">{o.soldCount}</TD>
                  <TD>
                    <Switch id={`po-${o.id}`} aria-label={t.offerActive} checked={o.active} onCheckedChange={(v) => run(() => updatePassOffer(o.id, { active: v }), { success: v ? t.offerOn : t.offerOff })} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </TabsContent>
    </Tabs>
  );
}

function NewPromo({ jobs }: { jobs: JobOption[] }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = promosMsgs[locale];
  const { promoKinds } = useLabels();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<PromoKind>("percent");
  const [value, setValue] = useState("10");
  const [min, setMin] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [jobId, setJobId] = useState("");
  const [limit, setLimit] = useState("");

  const numeric = Number(value);
  const valid = /^[A-Z0-9]{3,20}$/.test(code) && (kind === "free_shipping" || numeric > 0) && (kind !== "percent" || numeric <= 100);

  const submit = () =>
    run(
      () =>
        createPromo({
          code,
          kind,
          value: kind === "percent" ? Math.round(numeric * 100) : kind === "fixed" ? (parseMoney(value.replace(",", ".")) ?? 0) : 0,
          minSubtotalCents: parseMoney(min.replace(",", ".")) ?? 0,
          startsAt: fromDateInput(startsAt, "start"),
          endsAt: fromDateInput(endsAt, "end"),
          jobIds: jobId ? [jobId] : [],
          usageLimit: limit ? Number(limit) : null,
          active: true,
        }),
      { success: t.created(code), onSuccess: () => setOpen(false) },
    );

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus /> {t.newCode}
        </Button>
      }
      title={t.newCode}
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.cancel}
          </Button>
          <Button loading={pending} disabled={!valid} onClick={submit}>
            {t.createCode}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label={t.code} htmlFor="pc-code" hint={t.codeHint} locale={locale}>
          <Input id="pc-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="FALL10" className="font-mono" />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.type} htmlFor="pc-kind" locale={locale}>
            <Select id="pc-kind" value={kind} onChange={(e) => setKind(e.target.value as PromoKind)}>
              {Object.entries(promoKinds).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          {kind !== "free_shipping" && (
            <Field label={kind === "percent" ? t.percentOff : t.amountOff} htmlFor="pc-value" locale={locale}>
              <Input id="pc-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
            </Field>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.minOrder} htmlFor="pc-min" optional locale={locale}>
            <Input id="pc-min" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
          </Field>
          <Field label={t.usageLimit} htmlFor="pc-limit" optional locale={locale}>
            <Input id="pc-limit" type="number" min={1} value={limit} onChange={(e) => setLimit(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.starts} htmlFor="pc-start" optional locale={locale}>
            <Input id="pc-start" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label={t.ends} htmlFor="pc-end" optional locale={locale}>
            <Input id="pc-end" type="date" value={endsAt} min={startsAt || undefined} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
        </div>
        <Field label={t.colAppliesTo} htmlFor="pc-job" locale={locale}>
          <Select id="pc-job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">{t.allJobs}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function NewPassOffer({ jobs }: { jobs: JobOption[] }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = promosMsgs[locale];
  const fmt = useFormatters();
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [amounts, setAmounts] = useState("25, 50, 75");
  const [bonus, setBonus] = useState("10");
  const job = jobs.find((j) => j.id === jobId);
  const [endsAt, setEndsAt] = useState(dateInputValue(job?.date));
  const parsed = amounts
    .split(/[,\s]+/)
    .map((a) => parseMoney(a))
    .filter((a): a is number => a !== null && a > 0);

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus /> {t.newOffer}
        </Button>
      }
      title={t.offerTitle}
      description={t.offerDescription}
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.cancel}
          </Button>
          <Button
            loading={pending}
            disabled={!jobId || parsed.length === 0 || !endsAt}
            onClick={() =>
              run(() => createPassOffer({ jobId, amountsCents: parsed, bonusBps: Math.round(Number(bonus || 0) * 100), endsAt: fromDateInput(endsAt, "end")!, active: true }), {
                success: t.offerCreated,
                onSuccess: () => setOpen(false),
              })
            }
          >
            {t.createOffer}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label={t.job} htmlFor="po-job" locale={locale}>
          <Select
            id="po-job"
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setEndsAt(dateInputValue(jobs.find((j) => j.id === e.target.value)?.date));
            }}
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.amounts} htmlFor="po-amounts" locale={locale} hint={parsed.length ? parsed.map((a) => fmt.money(a, { whole: true })).join(" · ") : t.amountsHint}>
          <Input id="po-amounts" value={amounts} onChange={(e) => setAmounts(e.target.value)} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.bonus} htmlFor="po-bonus" locale={locale} hint={bonus ? t.bonusHint(fmt.money(5000, { whole: true }), fmt.money(5000 + Math.round((5000 * Number(bonus)) / 100))) : undefined}>
            <Input id="po-bonus" inputMode="decimal" value={bonus} onChange={(e) => setBonus(e.target.value)} />
          </Field>
          <Field label={t.offerEnds} htmlFor="po-end" hint={t.offerEndsHint} locale={locale}>
            <Input id="po-end" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
