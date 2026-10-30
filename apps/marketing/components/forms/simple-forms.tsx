"use client";

import { Button } from "@snapbell/ui/button";
import { useLocale } from "@snapbell/ui/locale";
import { useActionState } from "react";
import { requestMigration, sendContact, submitDataRequest, type FormState } from "@/app/actions";
import { commonMsgs } from "@/messages/common";
import { formMsgs } from "@/messages/forms";
import { FormMessage, LocaleField, SelectField, SuccessPanel, TextAreaField, TextField } from "./form-bits";

const idle: FormState = { status: "idle" };

export function ContactForm() {
  const locale = useLocale();
  const t = formMsgs[locale];
  const [state, action, pending] = useActionState(sendContact, idle);
  if (state.status === "success") return <SuccessPanel title={state.message ?? commonMsgs[locale].forms.thanks} />;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <LocaleField />
      <FormMessage state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="name" label={t.fields.name} autoComplete="name" state={state} />
        <TextField name="email" label={t.fields.email} type="email" autoComplete="email" state={state} />
      </div>
      <TextField name="studio" label={t.fields.studio} autoComplete="organization" state={state} optional />
      <TextAreaField name="message" label={t.fields.howHelp} rows={5} state={state} />
      <Button type="submit" loading={pending} className="w-fit">
        {t.contact.submit}
      </Button>
    </form>
  );
}

export function SwitchForm() {
  const t = formMsgs[useLocale()];
  const [state, action, pending] = useActionState(requestMigration, idle);
  if (state.status === "success") return <SuccessPanel title={t.results.migrationTitle}>{state.message}</SuccessPanel>;
  const o = t.switch.options;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <LocaleField />
      <FormMessage state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="name" label={t.fields.name} autoComplete="name" state={state} />
        <TextField name="email" label={t.fields.email} type="email" autoComplete="email" state={state} />
      </div>
      <TextField name="studio" label={t.fields.studioName} autoComplete="organization" state={state} />
      <SelectField
        name="current"
        label={t.fields.current}
        state={state}
        options={[
          { value: "paper", label: o.paper },
          { value: "platform", label: o.platform },
          { value: "own-site", label: o.ownSite },
          { value: "new", label: o.new },
        ]}
      />
      <TextField name="jobs" label={t.fields.jobsPerYear} inputMode="numeric" state={state} optional />
      <Button type="submit" loading={pending} className="w-fit">
        {t.switch.submit}
      </Button>
    </form>
  );
}

export function DataRequestForm() {
  const t = formMsgs[useLocale()];
  const [state, action, pending] = useActionState(submitDataRequest, idle);
  if (state.status === "success") return <SuccessPanel title={t.results.dataRequestTitle}>{state.message}</SuccessPanel>;
  const o = t.dataRequest.options;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <LocaleField />
      <FormMessage state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="name" label={t.fields.yourName} autoComplete="name" state={state} />
        <TextField name="email" label={t.fields.emailOnFile} type="email" autoComplete="email" state={state} />
      </div>
      <TextField name="phone" label={t.fields.phoneOnFile} type="tel" autoComplete="tel" state={state} optional />
      <SelectField
        name="type"
        label={t.fields.requestType}
        state={state}
        options={[
          { value: "access", label: o.access },
          { value: "correct", label: o.correct },
          { value: "delete", label: o.delete },
          { value: "biometrics", label: o.biometrics },
        ]}
      />
      <TextField name="child" label={t.fields.child} state={state} optional />
      <TextAreaField name="details" label={t.fields.details} rows={4} state={state} optional />
      <Button type="submit" loading={pending} className="w-fit">
        {t.dataRequest.submit}
      </Button>
    </form>
  );
}
