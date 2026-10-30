"use client";

import { PLATFORM_FEE_STANDARD_BPS, PLATFORM_FEE_VOLUME_BPS, VOLUME_TIER_THRESHOLD_CENTS, platformFeeBpsFor, type Address, type Studio } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody } from "@snapbell/ui/card";
import { Alert, ProgressBar } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useFormatters, useLocale } from "@snapbell/ui/locale";
import { CreditCard, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useAction } from "@/components/use-action";
import { useLabels } from "@/components/use-labels";
import { connectStripe, updateStudio } from "@/lib/actions";
import { settingsMsgs } from "@/messages/settings";

const STATUS_TONE = { active: "success", pending: "warning", restricted: "danger", not_connected: "outline" } as const;

const emptyAddress: Address = { line1: "", line2: null, city: "", state: "", postalCode: "", country: "US" };

export function PaymentsClient({ studio }: { studio: Studio }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = settingsMsgs[locale].payments;
  const fmt = useFormatters();
  const pct = (bps: number) => fmt.percent(bps / 10_000, 1);
  const { payoutSchedule } = useLabels();
  const [legalName, setLegalName] = useState(studio.taxInfo.legalName);
  const [ein, setEin] = useState(studio.taxInfo.ein ?? "");
  const [address, setAddress] = useState<Address>(studio.taxInfo.address ?? emptyAddress);
  const s = studio.stripe;
  const rate = platformFeeBpsFor(studio.ytdSalesCents);
  const set = (k: keyof Address, v: string) => setAddress((a) => ({ ...a, [k]: k === "line2" ? v || null : v }));

  const connect = () =>
    run(() => connectStripe(), {
      onSuccess: (res) => {
        if (/^https?:\/\//.test(res.url) && !res.url.startsWith(window.location.origin)) window.location.href = res.url;
      },
      success: s.status === "not_connected" ? t.connected : t.verificationUpdated,
    });

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardBody className="grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <CreditCard className="size-5" aria-hidden /> Stripe Connect
              </h2>
              <p className="text-sm text-muted">{t.stripeBody(payoutSchedule[s.payoutSchedule])}</p>
            </div>
            <Badge tone={STATUS_TONE[s.status]}>{t.status[s.status]}</Badge>
          </div>
          {s.requirementsDue.length > 0 && (
            <Alert tone="warning" title={t.needsInfo}>
              <ul className="list-disc pl-4">
                {s.requirementsDue.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Alert>
          )}
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted">{t.account}</dt>
              <dd className="font-mono">{s.accountId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">{t.schedule}</dt>
              <dd className="first-letter:uppercase">{payoutSchedule[s.payoutSchedule]}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            {s.status === "active" ? (
              <Button variant="outline" onClick={connect} loading={pending}>
                <ExternalLink /> {t.dashboard}
              </Button>
            ) : (
              <Button onClick={connect} loading={pending}>
                {s.status === "not_connected" ? t.connect : t.reverify}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-4">
          <h2 className="text-lg font-semibold">{t.feeTitle}</h2>
          <p className="text-sm text-muted">{t.feeBody(pct(PLATFORM_FEE_STANDARD_BPS), fmt.money(VOLUME_TIER_THRESHOLD_CENTS, { whole: true }), pct(PLATFORM_FEE_VOLUME_BPS))}</p>
          <ProgressBar
            value={(studio.ytdSalesCents / VOLUME_TIER_THRESHOLD_CENTS) * 100}
            label={t.feeProgress(fmt.money(studio.ytdSalesCents, { whole: true }), pct(rate))}
            showValue={false}
            tone={rate === PLATFORM_FEE_VOLUME_BPS ? "success" : "accent"}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid gap-5">
          <div>
            <h2 className="text-lg font-semibold">{t.taxTitle}</h2>
            <p className="text-sm text-muted">{t.taxBody}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t.legalName} htmlFor="tx-name" locale={locale}>
              <Input id="tx-name" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </Field>
            <Field label={t.ein} htmlFor="tx-ein" optional hint={t.einHint} locale={locale}>
              <Input id="tx-ein" value={ein} onChange={(e) => setEin(e.target.value)} placeholder="12-3456789" />
            </Field>
          </div>
          <Field label={t.street} htmlFor="tx-l1" locale={locale}>
            <Input id="tx-l1" autoComplete="address-line1" value={address.line1} onChange={(e) => set("line1", e.target.value)} />
          </Field>
          <div className="grid gap-4 md:grid-cols-[1fr_96px_140px]">
            <Field label={t.city} htmlFor="tx-city" locale={locale}>
              <Input id="tx-city" autoComplete="address-level2" value={address.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label={t.state} htmlFor="tx-state" locale={locale}>
              <Input id="tx-state" autoComplete="address-level1" maxLength={2} value={address.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
            </Field>
            <Field label={t.zip} htmlFor="tx-zip" locale={locale}>
              <Input id="tx-zip" autoComplete="postal-code" inputMode="numeric" value={address.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button
              loading={pending}
              disabled={!legalName.trim()}
              onClick={() => run(() => updateStudio({ taxInfo: { legalName: legalName.trim(), ein: ein.trim() || null, address: address.line1 ? address : null } }), { success: t.taxSaved })}
            >
              {t.saveTax}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
