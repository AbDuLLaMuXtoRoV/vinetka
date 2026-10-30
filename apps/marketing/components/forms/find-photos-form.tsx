"use client";

import { Button } from "@snapbell/ui/button";
import { CodeInput } from "@snapbell/ui/code-input";
import { useLocale } from "@snapbell/ui/locale";
import { ArrowRight } from "lucide-react";
import { useActionState, useState } from "react";
import { findPhotos, type FormState } from "@/app/actions";
import { track } from "@/lib/analytics";
import { formMsgs } from "@/messages/forms";
import { LocaleField } from "./form-bits";

const idle: FormState = { status: "idle" };

/** Parent entry: six-box code, submits to the Family Store. */
export function FindPhotosForm() {
  const locale = useLocale();
  const t = formMsgs[locale].find;
  const [state, action, pending] = useActionState(findPhotos, idle);
  const [code, setCode] = useState("");
  const error = state.errors?.code;

  return (
    <form
      action={action}
      onSubmit={() => track("store_code_entered", { length: code.length, source: "find-my-photos", locale })}
      className="grid gap-4"
      noValidate
    >
      <LocaleField />
      <p className="text-sm font-medium" aria-hidden>
        {t.label}
      </p>
      <CodeInput value={code} onChange={setCode} label={t.codeAria} invalid={!!error} autoFocus />
      <input type="hidden" name="code" value={code} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" block loading={pending} disabled={code.length < 6}>
        {t.submit} <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}
