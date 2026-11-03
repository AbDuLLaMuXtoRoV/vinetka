"use client";

import { MARKETS } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { useLocale } from "@snapbell/ui/locale";
import { useActionState } from "react";
import { submitPartnerRequest, type FormState } from "@site/actions";
import { commonMsgs } from "@site/messages/common";
import { formMsgs } from "@site/messages/forms";
import {
  CheckboxChips,
  FormMessage,
  HoneypotField,
  LocaleField,
  PhoneField,
  SelectField,
  SuccessPanel,
  TextAreaField,
  TextField,
  useTrackSubmitted,
} from "./form-bits";

const idle: FormState = { status: "idle" };

/**
 * /contact: photographers ask to become partners (the Snapbell team then
 * creates their studio in Admin); schools, parents and others ask questions.
 */
export function PartnerForm() {
  const locale = useLocale();
  const t = formMsgs[locale];
  const markets = commonMsgs[locale].markets;
  const [state, action, pending] = useActionState(submitPartnerRequest, idle);
  useTrackSubmitted(state);

  if (state.status === "success") {
    return <SuccessPanel title={state.kind === "partner" ? t.results.partnerTitle : commonMsgs[locale].forms.thanks}>{state.message}</SuccessPanel>;
  }

  const roles = t.partner.roles;
  return (
    <form action={action} className="relative grid gap-5" noValidate>
      <LocaleField />
      <HoneypotField />
      <FormMessage state={state} />
      <SelectField
        name="role"
        label={t.fields.iAm}
        state={state}
        options={[
          { value: "photographer", label: roles.photographer },
          { value: "studio", label: roles.studio },
          { value: "school", label: roles.school },
          { value: "parent", label: roles.parent },
          { value: "other", label: roles.other },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="name" label={t.fields.yourName} autoComplete="name" state={state} />
        <TextField name="company" label={t.fields.company} autoComplete="organization" state={state} optional />
        <PhoneField name="phone" label={t.fields.phone} hint={t.fields.phoneHint} state={state} optional />
        <TextField name="email" label={t.fields.email} type="email" autoComplete="email" state={state} optional />
        <TextField name="city" label={t.fields.city} autoComplete="address-level2" state={state} optional />
      </div>
      <CheckboxChips name="markets" legend={t.fields.marketsShoot} options={MARKETS.map((m) => ({ value: m, label: markets[m] }))} />
      <TextAreaField name="message" label={t.fields.aboutStudio} rows={5} placeholder={t.fields.aboutStudioHint} state={state} />
      <div className="grid gap-3">
        <Button type="submit" size="lg" loading={pending} className="w-fit">
          {t.partner.submit}
        </Button>
        <p className="text-xs text-muted">{t.partner.privacy}</p>
      </div>
    </form>
  );
}
