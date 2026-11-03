"use client";

import { MARKETS, parseMoney, type Market, type Studio } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody } from "@snapbell/ui/card";
import { Chip } from "@snapbell/ui/chip";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { LanguageSwitcher, useFormatters, useLocale } from "@snapbell/ui/locale";
import { Check } from "lucide-react";
import { useState } from "react";
import { ColorPicker, LogoPicker } from "@studio/components/logo-picker";
import { useAction } from "@studio/components/use-action";
import { updateStudio } from "@studio/lib/actions";
import { useLabels } from "@studio/components/use-labels";
import { settingsMsgs } from "@studio/messages/settings";

export function StudioSettingsForm({ studio, canEdit }: { studio: Studio; canEdit: boolean }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = settingsMsgs[locale].studio;
  const fmt = useFormatters();
  const { markets: marketLabels } = useLabels();
  const [name, setName] = useState(studio.name);
  const [logo, setLogo] = useState(studio.logoUrl);
  const [color, setColor] = useState(studio.brandColor);
  const [domain, setDomain] = useState(studio.albumDomain ?? "");
  const [markets, setMarkets] = useState<Market[]>(studio.markets);
  const [bigOrder, setBigOrder] = useState((studio.bigOrderThresholdCents / 100).toFixed(0));
  const domainValid = !domain || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain);

  return (
    <Card>
      <CardBody className="grid gap-6">
        <div>
          <h2 className="text-lg font-semibold">{t.brand}</h2>
          <p className="text-sm text-muted">{t.brandBody}</p>
        </div>
        <fieldset disabled={!canEdit} className="grid gap-5 disabled:opacity-70">
          <Field label={t.name} htmlFor="st-name" locale={locale}>
            <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t.logo} htmlFor="st-logo" locale={locale}>
            <LogoPicker value={logo} onChange={setLogo} name={name} />
          </Field>
          <Field label={t.color} htmlFor="st-color" locale={locale}>
            <ColorPicker id="st-color" value={color} onChange={setColor} />
          </Field>
          <Field
            label={t.domain}
            htmlFor="st-domain"
            optional
            locale={locale}
            error={domainValid ? undefined : t.domainError}
            hint={t.domainHint}
          >
            <Input id="st-domain" value={domain} onChange={(e) => setDomain(e.target.value.trim())} placeholder="photos.yourstudio.com" />
          </Field>
          <Field label={t.markets} htmlFor="st-markets" locale={locale}>
            <div id="st-markets" className="flex flex-wrap gap-2">
              {MARKETS.map((m) => (
                <Chip key={m} selected={markets.includes(m)} onClick={() => setMarkets((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))}>
                  {markets.includes(m) && <Check />}
                  {marketLabels[m]}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label={t.bigOrder} htmlFor="st-big" locale={locale} hint={t.bigOrderHint(fmt.money(parseMoney(bigOrder.replace(",", ".")) ?? 0))}>
            <Input id="st-big" inputMode="decimal" value={bigOrder} onChange={(e) => setBigOrder(e.target.value)} className="max-w-40" />
          </Field>
        </fieldset>
        <div className="grid gap-1.5 border-t border-border pt-5">
          <span className="text-sm font-medium">{t.language}</span>
          <LanguageSwitcher className="w-fit" />
          <p className="text-xs text-muted">{t.languageHint}</p>
        </div>
        {canEdit && (
          <div className="flex justify-end">
            <Button
              loading={pending}
              disabled={!name.trim() || !domainValid}
              onClick={() =>
                run(() => updateStudio({ name: name.trim(), logoUrl: logo, brandColor: color, albumDomain: domain || null, markets, bigOrderThresholdCents: parseMoney(bigOrder.replace(",", ".")) ?? studio.bigOrderThresholdCents }), {
                  success: t.saved,
                })
              }
            >
              {t.save}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
