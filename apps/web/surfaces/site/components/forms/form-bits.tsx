"use client";

import { Alert } from "@snapbell/ui/feedback";
import { Field, describedBy } from "@snapbell/ui/field";
import { Input, Textarea } from "@snapbell/ui/input";
import { useLocale } from "@snapbell/ui/locale";
import { PhoneInput } from "@snapbell/ui/phone-input";
import { Select } from "@snapbell/ui/select";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import type { FormState } from "@site/actions";
import { track } from "@site/lib/analytics";
import { commonMsgs } from "@site/messages/common";

/** The value the visitor submitted last time (kept after a validation error). */
function submitted(state: FormState, name: string): string | undefined {
  const v = state.values?.[name];
  return Array.isArray(v) ? v[0] : v;
}

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
  defaultValue,
  ...props
}: Omit<ComponentProps<"input">, "name"> & { name: string; label: string; state: FormState; hint?: ReactNode; optional?: boolean }) {
  const locale = useLocale();
  const id = `f-${name}`;
  const error = state.errors?.[name];
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} optional={optional} locale={locale} className={className}>
      <Input
        id={id}
        name={name}
        required={!optional}
        defaultValue={submitted(state, name) ?? defaultValue}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, { hint, error })}
        {...props}
      />
    </Field>
  );
}

export function TextAreaField({
  name,
  label,
  state,
  optional,
  defaultValue,
  ...props
}: Omit<ComponentProps<"textarea">, "name"> & { name: string; label: string; state: FormState; optional?: boolean }) {
  const locale = useLocale();
  const id = `f-${name}`;
  const error = state.errors?.[name];
  return (
    <Field label={label} htmlFor={id} error={error} optional={optional} locale={locale}>
      <Textarea
        id={id}
        name={name}
        required={!optional}
        defaultValue={submitted(state, name) ?? defaultValue}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, { error })}
        {...props}
      />
    </Field>
  );
}

export function SelectField({
  name,
  label,
  state,
  options,
  placeholder,
  defaultValue,
  ...props
}: Omit<ComponentProps<"select">, "name"> & { name: string; label: string; state: FormState; options: Array<{ value: string; label: string }>; placeholder?: string }) {
  const locale = useLocale();
  const id = `f-${name}`;
  const error = state.errors?.[name];
  return (
    <Field label={label} htmlFor={id} error={error} locale={locale}>
      <Select id={id} name={name} required defaultValue={submitted(state, name) ?? defaultValue ?? ""} aria-invalid={!!error || undefined} aria-describedby={describedBy(id, { error })} {...props}>
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

/** Phone with the +998 prefix; submits the national number, which the server converts to E.164. */
export function PhoneField({ name, label, state, hint, optional }: { name: string; label: string; state: FormState; hint?: ReactNode; optional?: boolean }) {
  const locale = useLocale();
  const id = `f-${name}`;
  const error = state.errors?.[name];
  const [value, setValue] = useState(() => submitted(state, name) ?? "");
  // Show what was submitted again after a validation error (the form reset clears the input).
  const last = submitted(state, name);
  useEffect(() => {
    if (last !== undefined) setValue(last);
  }, [state, last]);
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} optional={optional} locale={locale}>
      <PhoneInput id={id} name={name} value={value} onValueChange={setValue} aria-invalid={!!error || undefined} aria-describedby={describedBy(id, { hint, error })} />
    </Field>
  );
}

/** Spam trap: hidden from people and screen readers, filled in by bots. */
export function HoneypotField() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** Multi-select checkbox chips; every checked value is submitted under `name`. */
export function CheckboxChips({
  name,
  legend,
  options,
  state,
}: {
  name: string;
  legend: string;
  options: Array<{ value: string; label: string }>;
  state?: FormState;
}) {
  const v = state?.values?.[name];
  const chosen = Array.isArray(v) ? v : v ? [v] : [];
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-input border border-border bg-surface px-3 text-sm transition-colors duration-150 hover:border-ink/40 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-bg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink md:min-h-9"
          >
            <input type="checkbox" name={name} value={o.value} defaultChecked={chosen.includes(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Fires contact_submitted once a lead form succeeds. */
export function useTrackSubmitted(state: FormState) {
  useEffect(() => {
    if (state.status === "success" && state.kind) track("contact_submitted", { kind: state.kind });
  }, [state.status, state.kind]);
}
