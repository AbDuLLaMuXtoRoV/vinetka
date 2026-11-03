"use client";

import { LOCALE_LABELS, type ContactRequest, type ContactRequestStatus } from "@snapbell/sdk";
import { Badge, type BadgeTone } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody } from "@snapbell/ui/card";
import { Textarea } from "@snapbell/ui/input";
import { useFormatters, useMessages } from "@snapbell/ui/locale";
import { formatPhoneDisplay } from "@snapbell/ui/phone-input";
import { Archive, CheckCircle2, Mail, MapPin, Phone, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CreateStudioButton } from "@admin/components/create-studio";
import { useAction } from "@admin/components/use-action";
import { updateContactRequestAction } from "@admin/lib/actions";
import { onboardingMsgs } from "@admin/messages/onboarding";

const statusTone: Record<ContactRequestStatus, BadgeTone> = { new: "accent", contacted: "sage", converted: "success", archived: "outline" };

export function RequestCard({ request: r, studioName }: { request: ContactRequest; studioName: string | null }) {
  const t = useMessages(onboardingMsgs).requests;
  const fmt = useFormatters();
  const { run, pending } = useAction();
  const [note, setNote] = useState(r.note ?? "");
  const noteChanged = note.trim() !== (r.note ?? "").trim();
  const setStatus = (status: ContactRequestStatus, success: string) => run(() => updateContactRequestAction(r.id, { status }), { success });
  const details = Object.entries(r.details).filter(([, v]) => v);
  const noteId = `note-${r.id}`;

  return (
    <Card className={r.status === "archived" ? "opacity-70" : undefined}>
      <CardBody className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold">{r.name}</span>
              {r.company && <span className="text-muted">· {r.company}</span>}
              <Badge tone={r.kind === "partner" ? "accent" : "neutral"}>{t.kinds[r.kind]}</Badge>
              <Badge tone={statusTone[r.status]}>{t.statuses[r.status]}</Badge>
            </p>
            <p className="text-xs text-muted">
              {t.received(fmt.dateTime(r.createdAt))} · {t.language}: {LOCALE_LABELS[r.locale].native}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {r.status === "new" && (
              <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("contacted", t.contacted)}>
                <CheckCircle2 /> {t.markContacted}
              </Button>
            )}
            {r.status !== "converted" && r.kind !== "data_request" && (
              <CreateStudioButton
                variant="outline"
                contactRequestId={r.id}
                prefill={{ studioName: r.company ?? "", ownerName: r.name, ownerEmail: r.email ?? "", ownerPhone: r.phone ?? undefined }}
              />
            )}
            {r.status === "archived" ? (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => setStatus("new", t.reopened)}>
                <RotateCcw /> {t.reopen}
              </Button>
            ) : (
              r.status !== "converted" && (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => setStatus("archived", t.archived)}>
                  <Archive /> {t.archive}
                </Button>
              )
            )}
          </div>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {r.phone && (
            <li className="flex items-center gap-1.5">
              <Phone className="size-4 text-muted" aria-hidden />
              <span className="sr-only">{t.phone}:</span>
              <a href={`tel:${r.phone}`} className="underline underline-offset-4 hover:no-underline">
                {formatPhoneDisplay(r.phone)}
              </a>
            </li>
          )}
          {r.email && (
            <li className="flex items-center gap-1.5">
              <Mail className="size-4 text-muted" aria-hidden />
              <span className="sr-only">{t.email}:</span>
              <a href={`mailto:${r.email}`} className="underline underline-offset-4 hover:no-underline">
                {r.email}
              </a>
            </li>
          )}
          {r.city && (
            <li className="flex items-center gap-1.5 text-muted">
              <MapPin className="size-4" aria-hidden />
              <span className="sr-only">{t.city}:</span>
              {r.city}
            </li>
          )}
        </ul>

        <p className="text-sm whitespace-pre-wrap">{r.message}</p>

        {details.length > 0 && (
          <dl className="grid gap-x-4 gap-y-1 rounded-input bg-sunken p-3 text-xs md:grid-cols-[auto_1fr]" aria-label={t.details}>
            {details.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {r.status === "converted" && r.studioId && (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-success" aria-hidden />
            {t.converted}:
            <Link href={`/admin/studios?q=${encodeURIComponent(studioName ?? "")}#studio-${r.studioId}`} className="font-medium underline underline-offset-4 hover:no-underline">
              {t.viewStudio(studioName ?? r.studioId)}
            </Link>
          </p>
        )}

        <div className="grid gap-2">
          <label htmlFor={noteId} className="text-xs font-medium text-muted">
            {t.note}
          </label>
          <Textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} className="min-h-16" />
          {noteChanged && (
            <div>
              <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => updateContactRequestAction(r.id, { note: note.trim() || null }), { success: t.noteSaved })}>
                {t.saveNote}
              </Button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
