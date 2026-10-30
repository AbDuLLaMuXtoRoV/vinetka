"use client";

import type { StudioBranding } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { CodeInput } from "@snapbell/ui/code-input";
import { Alert } from "@snapbell/ui/feedback";
import { brandStyle } from "@snapbell/ui/lib/brand";
import { initials } from "@snapbell/ui/lib/format";
import { useFormatters, useMessages } from "@snapbell/ui/locale";
import { ArrowRight, MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { recognizeCode, type ActionFailure } from "@/app/actions";
import { track } from "@/lib/analytics";
import { dayInSentence } from "@/lib/dates";
import { accessMsgs } from "@/messages/access";
import { codeEntryMsgs } from "@/messages/code-entry";
import { NotifyMeForm } from "./notify-me-form";

/** Screen 1: six-box code entry. The studio's logo appears as soon as the code is recognised. */
export function CodeEntry({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const t = useMessages(codeEntryMsgs);
  const [code, setCode] = useState(initialCode);
  const [studio, setStudio] = useState<StudioBranding | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, start] = useTransition();
  const autoChecked = useRef(false);

  const check = (value: string) => {
    setFailure(null);
    start(async () => {
      const res = await recognizeCode(value);
      track("store_code_entered", { recognized: res.ok, reason: res.ok ? undefined : res.code });
      if (res.ok) {
        setStudio(res.data.branding);
        setNext(res.data.next);
        router.push(res.data.next);
      } else {
        setStudio(res.studio ?? null);
        setFailure(res);
      }
    });
  };

  useEffect(() => {
    if (!autoChecked.current && initialCode.length === 6) {
      autoChecked.current = true;
      check(initialCode);
    }
    // Run once for a code passed in the link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-8" style={brandStyle(studio?.brandColor)}>
      <div className="grid justify-items-center gap-4 text-center">
        <div className="grid h-16 place-items-center" aria-live="polite">
          {studio ? (
            studio.logoUrl ? (
              <img src={studio.logoUrl} alt={studio.name} className="h-14 w-auto max-w-48 animate-pop-in object-contain" />
            ) : (
              <span className="flex animate-pop-in items-center gap-3 text-lg font-semibold">
                <span className="grid size-12 place-items-center rounded-full bg-accent text-base font-bold text-accent-ink" aria-hidden>
                  {initials(studio.name)}
                </span>
                {studio.name}
              </span>
            )
          ) : (
            <span className="grid size-14 place-items-center rounded-card bg-accent text-accent-ink" aria-hidden>
              <svg viewBox="0 0 64 64" className="size-9">
                <rect x="12" y="20" width="40" height="28" rx="6" fill="currentColor" />
                <rect x="24" y="14" width="16" height="8" rx="3" fill="currentColor" />
                <circle cx="32" cy="34" r="9" fill="var(--sb-accent)" />
                <circle cx="32" cy="34" r="5" fill="currentColor" />
              </svg>
            </span>
          )}
        </div>
        <div className="grid gap-2">
          <h1 className="text-xl font-semibold text-balance">{t.title}</h1>
          <p className="text-muted">{t.intro}</p>
        </div>
      </div>

      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 6) check(code);
        }}
      >
        <CodeInput
          label={t.codeLabel}
          value={code}
          onChange={(v) => {
            setCode(v);
            if (failure) setFailure(null);
          }}
          onComplete={check}
          invalid={failure?.code === "invalid_code"}
          autoFocus={!initialCode}
          disabled={pending && !!next}
        />
        <Button type="submit" size="lg" block loading={pending} disabled={code.length !== 6}>
          {studio && next ? t.opening(studio.name) : t.submit}
          {!pending && <ArrowRight aria-hidden />}
        </Button>
      </form>

      {failure && <CodeFailure failure={failure} code={code} />}

      <div className="flex items-start gap-3 rounded-card border border-border bg-surface p-4 text-sm">
        <MessageSquareText className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
        <div className="grid gap-1">
          <p className="font-medium">{t.textTitle}</p>
          <p className="text-muted">{t.textBody}</p>
        </div>
      </div>
    </div>
  );
}

function CodeFailure({ failure, code }: { failure: ActionFailure; code: string }) {
  const a = useMessages(accessMsgs);
  const fmt = useFormatters();
  const studio = failure.studio?.name ?? null;
  if (failure.code === "not_published") {
    return (
      <div className="grid gap-4 rounded-card border border-border bg-surface p-5">
        <Alert tone="info" title={a.notReadyTitle} className="border-0 p-0">
          {a.notReadyBody(studio, failure.publishAt ? dayInSentence(fmt, failure.publishAt) : null)}
        </Alert>
        <NotifyMeForm code={code} />
      </div>
    );
  }
  if (failure.code === "expired") {
    return (
      <Alert tone="warning" title={a.closedTitle}>
        {a.closedBody(studio)}
      </Alert>
    );
  }
  if (failure.code === "invalid_code" || failure.code === "not_found") {
    return (
      <Alert tone="danger" title={a.invalidTitle}>
        {a.invalidBody}
      </Alert>
    );
  }
  return (
    <Alert tone="danger" title={failure.code === "rate_limited" ? a.tooMany : a.failed}>
      {failure.message}
    </Alert>
  );
}
