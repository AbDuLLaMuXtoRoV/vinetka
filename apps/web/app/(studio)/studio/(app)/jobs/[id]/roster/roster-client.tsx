"use client";

import type { Job, Subject, SubjectInput } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Checkbox } from "@snapbell/ui/checkbox";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { EmptyState } from "@snapbell/ui/feedback";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useFormatters, useLocale } from "@snapbell/ui/locale";
import { Menu, Modal } from "@snapbell/ui/overlay";
import { Ellipsis, KeyRound, Pencil, Plus, Printer, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAction } from "@studio/components/use-action";
import { createSubject, regenerateCodes, removeSubject, updateSubject } from "@studio/lib/actions";
import { rosterMsgs } from "@studio/messages/roster";
import { CsvImport } from "./csv-import";

export function RosterClient({ job, subjects }: { job: Job; subjects: Subject[] }) {
  const { run, pending } = useAction();
  const t = rosterMsgs[useLocale()];
  const fmt = useFormatters();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Subject | "new" | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const personal = job.albumType === "personal";

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return subjects;
    return subjects.filter((s) => `${s.firstName} ${s.lastName} ${s.group} ${s.accessCode}`.toLowerCase().includes(term));
  }, [q, subjects]);

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));
  const toggle = (id: string) => setSelected((cur) => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPlaceholder} aria-label={t.searchLabel} className="pl-9" />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <CsvImport jobId={job.id} />
          <Button variant="outline" onClick={() => setEditing("new")}>
            <Plus /> {t.addSubject}
          </Button>
          {personal && (
            <Button variant="outline" onClick={() => setConfirmRegen(true)} disabled={subjects.length === 0}>
              <KeyRound /> {selected.size > 0 ? t.regenerateSome(selected.size) : t.regenerateAll}
            </Button>
          )}
          <Button variant="secondary" asChild>
            <Link href={`/studio/jobs/${job.id}/roster/print`}>
              <Printer /> {t.printLink}
            </Link>
          </Button>
        </div>
      </div>

      {!personal && (
        <p className="rounded-input bg-sunken px-4 py-3 text-sm text-muted">
          {(() => {
            const [before, after] = t.sharedNote(job.albumType === "team" ? t.team : t.open, "\u0000").split("\u0000");
            return (
              <>
                {before}
                <span className="font-mono font-medium text-ink">{job.sharedAccessCode ?? "—"}</span>
                {after}
              </>
            );
          })()}
        </p>
      )}

      {subjects.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={t.emptyTitle}
          description={t.emptyBody}
          action={<CsvImport jobId={job.id} primary />}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH className="w-10">
                <Checkbox
                  id="roster-all"
                  aria-label={t.selectAll}
                  checked={allSelected}
                  onCheckedChange={(v) => setSelected(v === true ? new Set(filtered.map((s) => s.id)) : new Set())}
                />
              </TH>
              <TH>{t.colName}</TH>
              <TH>{t.colGroup}</TH>
              <TH>{t.colCode}</TH>
              <TH align="right">{t.colMatched}</TH>
              <TH>{t.colBought}</TH>
              <TH>
                <span className="sr-only">{t.subjectActions}</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {filtered.map((s) => (
              <TR key={s.id} selected={selected.has(s.id)}>
                <TD>
                  <Checkbox id={`sel-${s.id}`} aria-label={t.selectOne(`${s.firstName} ${s.lastName}`)} checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                </TD>
                <TD className="font-medium">
                  {s.lastName}, {s.firstName}
                </TD>
                <TD className="text-muted">{s.group}</TD>
                <TD className="font-mono">{s.accessCode}</TD>
                <TD align="right">{s.matchedPhotoCount === 0 ? <Badge tone="warning">0</Badge> : fmt.number(s.matchedPhotoCount)}</TD>
                <TD>{s.purchased ? <Badge tone="success">{t.yes}</Badge> : <span className="text-sm text-muted">{t.notYet}</span>}</TD>
                <TD align="right">
                  <Menu
                    label={t.subjectActions}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label={t.actionsFor(`${s.firstName} ${s.lastName}`)}>
                        <Ellipsis />
                      </Button>
                    }
                    items={[
                      { label: t.edit, icon: <Pencil />, onSelect: () => setEditing(s) },
                      ...(personal ? [{ label: t.newCode, icon: <KeyRound />, onSelect: () => run(() => regenerateCodes(job.id, [s.id]), { success: t.newCodeFor(s.firstName) }) }] : []),
                      null,
                      { label: t.remove, icon: <Trash2 />, danger: true, onSelect: () => run(() => removeSubject(job.id, s.id), { success: t.removed(s.firstName) }) },
                    ]}
                  />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="text-xs text-muted">
        {t.summary(subjects.length, subjects.filter((s) => s.matchedPhotoCount > 0).length, subjects.filter((s) => s.purchased).length)}
      </p>

      {editing && (
        <SubjectDialog
          key={editing === "new" ? "new" : editing.id}
          subject={editing === "new" ? null : editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(input) =>
            run(() => (editing === "new" ? createSubject(job.id, input) : updateSubject(job.id, editing.id, input)), {
              success: editing === "new" ? t.added : t.saved,
              onSuccess: () => setEditing(null),
            })
          }
        />
      )}

      <Modal
        open={confirmRegen}
        onOpenChange={setConfirmRegen}
        title={selected.size > 0 ? t.regenTitleSome(selected.size) : t.regenTitleAll}
        description={t.regenBody}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRegen(false)}>
              {t.cancel}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                run(() => regenerateCodes(job.id, selected.size > 0 ? [...selected] : undefined), {
                  success: t.regenerated,
                  onSuccess: () => {
                    setConfirmRegen(false);
                    setSelected(new Set());
                  },
                })
              }
            >
              {t.regenerate}
            </Button>
          </>
        }
      />
    </div>
  );
}

function SubjectDialog({ subject, onSave, onClose, pending }: { subject: Subject | null; onSave: (input: SubjectInput) => void; onClose: () => void; pending: boolean }) {
  const [firstName, setFirstName] = useState(subject?.firstName ?? "");
  const [lastName, setLastName] = useState(subject?.lastName ?? "");
  const [group, setGroup] = useState(subject?.group ?? "");
  const locale = useLocale();
  const t = rosterMsgs[locale];
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={subject ? t.editTitle(`${subject.firstName} ${subject.lastName}`) : t.addTitle}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button loading={pending} disabled={!firstName.trim() || !lastName.trim()} onClick={() => onSave({ firstName: firstName.trim(), lastName: lastName.trim(), group: group.trim() })}>
            {t.save}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.firstName} htmlFor="sub-first" locale={locale}>
            <Input id="sub-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
          </Field>
          <Field label={t.lastName} htmlFor="sub-last" locale={locale}>
            <Input id="sub-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <Field label={t.group} htmlFor="sub-group" locale={locale}>
          <Input id="sub-group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder={t.groupPlaceholder} />
        </Field>
      </div>
    </Modal>
  );
}
