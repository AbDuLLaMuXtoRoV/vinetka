"use client";

import { MARKETS, ONBOARDING_STEPS, type Lab, type Market, type PriceSheetSummary, type Studio } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Chip } from "@snapbell/ui/chip";
import { Stepper } from "@snapbell/ui/data";
import { Alert } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { brandStyle } from "@snapbell/ui/lib/brand";
import { LanguageSwitcher, useLocale } from "@snapbell/ui/locale";
import { RadioGroup } from "@snapbell/ui/radio-group";
import { Check, CreditCard, PartyPopper } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ColorPicker, LogoPicker } from "@studio/components/logo-picker";
import { useAction } from "@studio/components/use-action";
import { useLabels } from "@studio/components/use-labels";
import { connectStripe, createPriceSheet, updateStudio } from "@studio/lib/actions";
import { commonMsgs } from "@studio/messages/common";
import { onboardingMsgs } from "@studio/messages/onboarding";

export function OnboardingWizard({ studio, labs, priceSheets }: { studio: Studio; labs: Lab[]; priceSheets: PriceSheetSummary[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = onboardingMsgs[locale];
  const c = commonMsgs[locale];
  const labels = useLabels();
  const { run, pending } = useAction();
  const firstOpen = ONBOARDING_STEPS.findIndex((s) => !studio.onboarding.completed.includes(s));
  const [step, setStep] = useState(firstOpen === -1 ? ONBOARDING_STEPS.length : firstOpen);
  const [name, setName] = useState(studio.name);
  const [logo, setLogo] = useState<string | null>(studio.logoUrl);
  const [color, setColor] = useState(studio.brandColor);
  const [markets, setMarkets] = useState<Market[]>(studio.markets);
  const [stripeStatus, setStripeStatus] = useState(studio.stripe.status);
  const [labId, setLabId] = useState(studio.defaultLabId ?? labs[0]?.id ?? "");
  const [template, setTemplate] = useState(priceSheets.length ? "existing" : "starter");

  const current = ONBOARDING_STEPS[step];
  const next = () => setStep((s) => s + 1);
  const save = (patch: Parameters<typeof updateStudio>[0]) =>
    run(() => updateStudio({ ...patch, completeOnboardingStep: current }), { onSuccess: next, refresh: false });

  if (!current) {
    return (
      <div className="grid justify-items-center gap-4 rounded-card border border-border bg-surface p-10 text-center">
        <PartyPopper className="size-10 text-sage" aria-hidden />
        <h1 className="text-2xl font-semibold">{t.doneTitle}</h1>
        <p className="max-w-md text-muted">{t.doneBody}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => router.push("/studio/jobs/new")}>{t.createFirstJob}</Button>
          <Button variant="outline" onClick={() => router.push("/studio/home")}>
            {t.goHome}
          </Button>
        </div>
      </div>
    );
  }

  const footer = (props: Omit<FooterProps, "backLabel" | "continueLabel">) => <Footer {...props} backLabel={c.back} continueLabel={c.continue} />;

  return (
    <>
      <Stepper steps={ONBOARDING_STEPS.map((s) => t.steps[s])} current={step} locale={locale} />
      <div className="grid gap-6 rounded-card border border-border bg-surface p-6 md:p-8">
        {current === "studio" && (
          <>
            <div>
              <h1 className="text-xl font-semibold">{t.studioTitle}</h1>
              <p className="text-sm text-muted">{t.studioBody}</p>
            </div>
            <Field label={t.studioName} htmlFor="ob-name" locale={locale}>
              <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">{t.language}</span>
              <LanguageSwitcher className="w-fit" />
              <p className="text-xs text-muted">{t.languageHint}</p>
            </div>
            {footer({ pending, disabled: !name.trim(), onNext: () => save({ name: name.trim() }) })}
          </>
        )}

        {current === "brand" && (
          <>
            <div>
              <h1 className="text-xl font-semibold">{t.brandTitle}</h1>
              <p className="text-sm text-muted">{t.brandBody}</p>
            </div>
            <LogoPicker value={logo} onChange={setLogo} name={name} />
            <Field label={t.brandColor} htmlFor="ob-color" locale={locale}>
              <ColorPicker id="ob-color" value={color} onChange={setColor} />
            </Field>
            <div className="rounded-card border border-border p-4" style={brandStyle(color)}>
              <p className="mb-3 text-xs text-muted">{t.preview}</p>
              <div className="flex items-center gap-3">
                {logo ? <img src={logo} alt="" className="size-10 rounded-input object-contain" /> : <span className="size-10 rounded-input bg-accent" aria-hidden />}
                <span className="font-semibold">{name}</span>
                <span className="ml-auto inline-flex h-10 items-center rounded-input bg-accent px-4 text-sm font-medium text-accent-ink">{t.shopThese}</span>
              </div>
            </div>
            {footer({ pending, onBack: () => setStep(step - 1), onNext: () => save({ logoUrl: logo, brandColor: color }) })}
          </>
        )}

        {current === "markets" && (
          <>
            <div>
              <h1 className="text-xl font-semibold">{t.marketsTitle}</h1>
              <p className="text-sm text-muted">{t.marketsBody}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {MARKETS.map((m) => (
                <Chip key={m} selected={markets.includes(m)} onClick={() => setMarkets((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))}>
                  {markets.includes(m) && <Check />}
                  {labels.markets[m]}
                </Chip>
              ))}
            </div>
            {footer({ pending, disabled: markets.length === 0, onBack: () => setStep(step - 1), onNext: () => save({ markets }) })}
          </>
        )}

        {current === "stripe" && (
          <>
            <div>
              <h1 className="text-xl font-semibold">{t.stripeTitle}</h1>
              <p className="text-sm text-muted">{t.stripeBody}</p>
            </div>
            {stripeStatus === "active" ? (
              <Alert tone="success" title={t.stripeConnected}>
                {t.payoutSchedule(labels.payoutSchedule[studio.stripe.payoutSchedule])}
              </Alert>
            ) : (
              <Button
                variant="secondary"
                className="w-fit"
                loading={pending}
                onClick={() =>
                  run(() => connectStripe(), {
                    refresh: false,
                    onSuccess: (res) => {
                      if (/^https?:\/\//.test(res.url) && !res.url.startsWith(window.location.origin)) window.location.href = res.url;
                      else setStripeStatus(res.studio.stripe.status);
                    },
                  })
                }
              >
                <CreditCard /> {t.connectStripe}
              </Button>
            )}
            <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-6">
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                {c.back}
              </Button>
              <div className="flex gap-2">
                {stripeStatus !== "active" && (
                  <Button variant="outline" onClick={next}>
                    {t.skip}
                  </Button>
                )}
                <Button disabled={stripeStatus !== "active"} loading={pending} onClick={() => save({})}>
                  {c.continue}
                </Button>
              </div>
            </div>
          </>
        )}

        {current === "lab" && (
          <>
            <div>
              <h1 className="text-xl font-semibold">{t.labTitle}</h1>
              <p className="text-sm text-muted">{t.labBody}</p>
            </div>
            <RadioGroup
              name="lab"
              value={labId}
              onValueChange={setLabId}
              variant="cards"
              options={labs.map((l) => ({ value: l.id, label: l.name, description: t.labDescription(l.region, l.turnaroundDays) }))}
            />
            {footer({ pending, disabled: !labId, onBack: () => setStep(step - 1), onNext: () => save({ defaultLabId: labId }) })}
          </>
        )}

        {current === "price_sheet" && (
          <>
            <div>
              <h1 className="text-xl font-semibold">{t.sheetTitle}</h1>
              <p className="text-sm text-muted">{t.sheetBody}</p>
            </div>
            <RadioGroup
              name="template"
              value={template}
              onValueChange={setTemplate}
              variant="cards"
              options={[
                { value: "starter", label: t.starter, description: t.starterDescription },
                ...(priceSheets.length ? [{ value: "existing", label: t.existing, description: t.existingDescription(priceSheets.length) }] : []),
              ]}
            />
            {footer({
              pending,
              onBack: () => setStep(step - 1),
              nextLabel: t.finish,
              onNext: () =>
                template === "starter"
                  ? run(() => createPriceSheet(t.starterName(name), labId || labs[0]!.id), { onSuccess: () => save({}), refresh: false })
                  : save({}),
            })}
          </>
        )}
      </div>
      <p className="text-center text-xs text-muted">{t.progressSaved}</p>
    </>
  );
}

interface FooterProps {
  onNext: () => void;
  onBack?: () => void;
  pending: boolean;
  disabled?: boolean;
  nextLabel?: string;
  backLabel: string;
  continueLabel: string;
}

function Footer({ onNext, onBack, pending, disabled, nextLabel, backLabel, continueLabel }: FooterProps) {
  return (
    <div className="flex justify-between gap-3 border-t border-border pt-6">
      {onBack ? (
        <Button variant="ghost" onClick={onBack}>
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={onNext} loading={pending} disabled={disabled}>
        {nextLabel ?? continueLabel}
      </Button>
    </div>
  );
}
