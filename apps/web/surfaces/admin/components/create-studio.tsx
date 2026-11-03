"use client";

import { MARKETS, type AdminCreateStudioResult, type Market } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Checkbox } from "@snapbell/ui/checkbox";
import { Alert } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useLocale } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { PhoneInput, formatPhoneNational, toE164 } from "@snapbell/ui/phone-input";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SetupLinkDialog } from "@admin/components/setup-link-dialog";
import { useAction } from "@admin/components/use-action";
import { createStudioAction } from "@admin/lib/actions";
import { onboardingMsgs } from "@admin/messages/onboarding";

export interface StudioPrefill {
  studioName?: string;
  ownerName?: string;
  ownerEmail?: string;
  /** E.164 */
  ownerPhone?: string;
}

/**
 * "Create studio": the only way a studio and its owner account come to exist.
 * Opened from the Studios screen, or from a request with its details prefilled.
 */
export function CreateStudioButton({
  prefill,
  contactRequestId,
  variant = "primary",
}: {
  prefill?: StudioPrefill;
  contactRequestId?: string;
  variant?: "primary" | "outline";
}) {
  const locale = useLocale();
  const t = onboardingMsgs[locale];
  const { run, pending } = useAction();
  const [open, setOpen] = useState(false);
  const [studioName, setStudioName] = useState(prefill?.studioName ?? "");
  const [ownerName, setOwnerName] = useState(prefill?.ownerName ?? "");
  const [ownerEmail, setOwnerEmail] = useState(prefill?.ownerEmail ?? "");
  const [ownerPhone, setOwnerPhone] = useState(prefill?.ownerPhone ? formatPhoneNational(prefill.ownerPhone) : "");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<AdminCreateStudioResult | null>(null);

  const id = (field: string) => `cs-${contactRequestId ?? "new"}-${field}`;

  const submit = () => {
    const email = ownerEmail.trim();
    if (!studioName.trim() || !ownerName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.create.required);
      return;
    }
    const phone = ownerPhone.trim() ? toE164(ownerPhone) : null;
    if (ownerPhone.trim() && !phone) {
      setError(t.create.badPhone);
      return;
    }
    setError(null);
    run(
      () =>
        createStudioAction({
          studioName: studioName.trim(),
          ownerName: ownerName.trim(),
          ownerEmail: email,
          ownerPhone: phone,
          markets,
          contactRequestId: contactRequestId ?? null,
        }),
      {
        success: t.create.created(studioName.trim()),
        onSuccess: (result) => {
          setOpen(false);
          setCreated(result);
        },
      },
    );
  };

  return (
    <>
      <Modal
        open={open}
        onOpenChange={setOpen}
        size="lg"
        trigger={
          <Button variant={variant} size={variant === "outline" ? "sm" : "md"}>
            <Plus /> {contactRequestId ? t.create.fromRequest : t.create.button}
          </Button>
        }
        title={t.create.title}
        description={t.create.description}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button loading={pending} onClick={submit}>
              {t.create.submit}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {error && <Alert tone="danger" title={error} />}
          <Field label={t.create.studioName} htmlFor={id("studio")} locale={locale}>
            <Input id={id("studio")} value={studioName} onChange={(e) => setStudioName(e.target.value)} autoComplete="organization" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t.create.ownerName} htmlFor={id("owner")} locale={locale}>
              <Input id={id("owner")} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label={t.create.ownerEmail} htmlFor={id("email")} hint={t.create.ownerEmailHint} locale={locale}>
              <Input id={id("email")} type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} autoComplete="email" />
            </Field>
          </div>
          <Field label={t.create.ownerPhone} htmlFor={id("phone")} optional locale={locale}>
            <PhoneInput id={id("phone")} value={ownerPhone} onValueChange={setOwnerPhone} />
          </Field>
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-medium">{t.create.markets}</legend>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {MARKETS.map((m) => (
                <Checkbox
                  key={m}
                  id={id(`market-${m}`)}
                  label={t.markets[m]}
                  checked={markets.includes(m)}
                  onCheckedChange={(on) => setMarkets((list) => (on === true ? [...list, m] : list.filter((x) => x !== m)))}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </Modal>
      <SetupLinkDialog
        name={created?.owner.name ?? ""}
        studioName={created?.studio.studio.name}
        link={created?.setupLink ?? null}
        onClose={() => setCreated(null)}
      />
    </>
  );
}
