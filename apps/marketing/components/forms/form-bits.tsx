"use client";

import { Alert } from "@snapbell/ui/feedback";
import { Field, describedBy } from "@snapbell/ui/field";
import { Input, Textarea } from "@snapbell/ui/input";
import { useLocale } from "@snapbell/ui/locale";
import { Select } from "@snapbell/ui/select";
import type { ComponentProps, ReactNode } from "react";
import type { FormState } from "@/app/actions";
import { commonMsgs } from "@/messages/common";

/** Sends the page's locale with the form so the server action answers in the same language. */
export function LocaleField() {
  return <input type="hidden" name="locale" value={useLocale()} />;
}

export function TextField({
  name,
  label,
  state,
  hint,
  optional,
  className,
  ...props
}: Omit<ComponentProps<"input">, "name"> & { name: string; label: string; state: FormState; hint?: ReactNode; optional?: boolean }) {
  const locale = useLocale();
  const id = `f-${name}`;
  const error = state.errors?.[name];
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} optional={optional} locale={locale} className={className}>
      <Input id={id} name={name} required={!optional} aria-invalid={!!error || undefined} aria-describedby={describedBy(id, { hint, error })} {...props} />
    </Field>
  );
}

export function TextAreaField({ name, label, state, optional, ...props }: Omit<ComponentProps<"textarea">, "name"> & { name: string; label: string; state: FormState; optional?: boolean }) {
  const locale = useLocale();
  const id = `f-${name}`;
  const error = state.errors?.[name];
  return (
    <Field label={label} htmlFor={id} error={error} optional={optional} locale={locale}>
      <Textarea id={id} name={name} required={!optional} aria-invalid={!!error || undefined} aria-describedby={describedBy(id, { error })} {...props} />
    </Field>
  );
}

export function SelectField({
  name,
  label,
  state,
  options,
  placeholder,
  ...props
}: Omit<ComponentProps<"select">, "name"> & { name: string; label: string; state: FormState; options: Array<{ value: string; label: string }>; placeholder?: string }) {
  const locale = useLocale();
  const id = `f-${name}`;
  const error = state.errors?.[name];
  return (
    <Field label={label} htmlFor={id} error={error} locale={locale}>
      <Select id={id} name={name} required defaultValue="" aria-invalid={!!error || undefined} aria-describedby={describedBy(id, { error })} {...props}>
        <option value="" disabled>
          {placeholder ?? commonMsgs[locale].forms.choose}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Form-level message (not tied to a field). */
export function FormMessage({ state }: { state: FormState }) {
  const locale = useLocale();
  if (state.status === "error" && state.message) return <Alert tone="danger" title={state.message} />;
  if (state.status === "error" && state.errors && Object.keys(state.errors).length > 0) {
    return <Alert tone="danger" title={commonMsgs[locale].forms.fixFields} />;
  }
  return null;
}

export function SuccessPanel({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Alert tone="success" title={title} className="p-6">
      {children}
    </Alert>
  );
}
