"use client";

import { Button } from "@snapbell/ui/button";
import { INTL_LOCALE } from "@snapbell/sdk";
import { cn } from "@snapbell/ui/lib/cn";
import { useLocale } from "@snapbell/ui/locale";
import { CalendarCheck } from "lucide-react";
import { useActionState, useEffect, useMemo, useState } from "react";
import { requestDemo, type FormState } from "@/app/actions";
import { track } from "@/lib/analytics";
import { formMsgs } from "@/messages/forms";
import { FormMessage, LocaleField, SelectField, SuccessPanel, TextField } from "./form-bits";

const idle: FormState = { status: "idle" };
const TIMES = [9, 10, 11, 13, 14, 15, 16];

/** Next five weekdays, starting tomorrow. */
function upcomingDays(): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (days.length < 5) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  return days;
}

export function DemoForm({ calendarUrl, markets }: { calendarUrl: string | null; markets: Array<{ value: string; label: string }> }) {
  const locale = useLocale();
  const tag = INTL_LOCALE[locale];
  const t = formMsgs[locale];
  const [state, action, pending] = useActionState(requestDemo, idle);
  const [days, setDays] = useState<Date[]>([]);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);

  // Computed on the client so the static page never shows stale dates.
  useEffect(() => setDays(upcomingDays()), []);

  useEffect(() => {
    if (state.status === "success") track("demo_booked", { withCalendar: !!calendarUrl, locale });
  }, [state.status, calendarUrl, locale]);

  const slots = useMemo(() => {
    const base = days[day];
    if (!base) return [];
    return TIMES.map((h) => {
      const t = new Date(base);
      t.setHours(h, 0, 0, 0);
      return t;
    });
  }, [days, day]);

  if (state.status === "success") {
    return (
      <div className="grid gap-6">
        <SuccessPanel title={t.results.demoTitle}>{state.message}</SuccessPanel>
        {calendarUrl && <iframe src={calendarUrl} title={t.demo.iframeTitle} className="h-[42rem] w-full rounded-card border border-border bg-surface" />}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5" noValidate>
      <LocaleField />
      <FormMessage state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="name" label={t.fields.yourName} autoComplete="name" state={state} />
        <TextField name="studio" label={t.fields.studioName} autoComplete="organization" state={state} />
        <TextField name="email" label={t.fields.workEmail} type="email" autoComplete="email" state={state} />
        <TextField name="phone" label={t.fields.phone} type="tel" autoComplete="tel" state={state} optional />
        <SelectField name="market" label={t.fields.mainMarket} state={state} options={markets} />
        <SelectField
          name="volume"
          label={t.fields.yearlyVolume}
          state={state}
          options={[
            { value: "<50k", label: t.demo.volumes.under50 },
            { value: "50-150k", label: t.demo.volumes.to150 },
            { value: "150-250k", label: t.demo.volumes.to250 },
            { value: "250k+", label: t.demo.volumes.over250 },
          ]}
        />
      </div>

      {calendarUrl ? (
        <p className="text-sm text-muted">{t.demo.calendarNote}</p>
      ) : (
        <fieldset className="grid gap-3">
          <legend className="mb-1 flex items-center gap-2 text-sm font-medium">
            <CalendarCheck className="size-4" aria-hidden /> {t.demo.pickSlot}
            <span className="font-normal text-muted">{t.demo.yourTz}</span>
          </legend>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t.demo.dayAria}>
            {days.map((d, i) => (
              <button
                key={d.toISOString()}
                type="button"
                aria-pressed={day === i}
                onClick={() => {
                  setDay(i);
                  setSlot(null);
                }}
                className={cn(
                  "grid min-h-14 min-w-20 shrink-0 place-items-center rounded-input border px-3 text-sm",
                  day === i ? "border-ink bg-ink text-bg" : "border-border bg-surface hover:border-ink/40",
                )}
              >
                <span className="text-xs opacity-80">{d.toLocaleDateString(tag, { weekday: "short" })}</span>
                <span className="font-semibold">{d.toLocaleDateString(tag, { month: "short", day: "numeric" })}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-7" role="group" aria-label={t.demo.timeAria}>
            {slots.map((time) => {
              const value = time.toISOString();
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={slot === value}
                  onClick={() => setSlot(value)}
                  className={cn(
                    "min-h-11 rounded-input border text-sm tabular-nums",
                    slot === value ? "border-ink bg-accent font-semibold text-accent-ink" : "border-border bg-surface hover:border-ink/40",
                  )}
                >
                  {time.toLocaleTimeString(tag, { hour: "numeric", minute: "2-digit" })}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="slot" value={slot ?? ""} />
          {state.errors?.slot && (
            <p role="alert" className="text-xs text-danger">
              {state.errors.slot}
            </p>
          )}
        </fieldset>
      )}

      <Button type="submit" size="lg" loading={pending} className="w-fit">
        {t.demo.submit}
      </Button>
      <p className="text-xs text-muted">{t.demo.privacy}</p>
    </form>
  );
}

