"use client";

import type { Lab, PriceSheetSummary } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useLocale, useMessages } from "@snapbell/ui/locale";
import { Menu, Modal } from "@snapbell/ui/overlay";
import { Select } from "@snapbell/ui/select";
import { Archive, ArchiveRestore, Copy, Ellipsis, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction } from "@/components/use-action";
import { createPriceSheet, duplicatePriceSheet, updatePriceSheet } from "@/lib/actions";
import { priceSheetMsgs } from "@/messages/price-sheets";

export function NewPriceSheet({ labs }: { labs: Lab[] }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = priceSheetMsgs[locale].create;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [labId, setLabId] = useState(labs[0]?.id ?? "");
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button>
          <Plus /> {t.button}
        </Button>
      }
      title={t.title}
      description={t.description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.cancel}
          </Button>
          <Button loading={pending} disabled={!name.trim() || !labId} onClick={() => run(() => createPriceSheet(name.trim(), labId), { success: t.created, onSuccess: (s) => router.push(`/price-sheets/${s.id}`) })}>
            {t.create}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label={t.name} htmlFor="ps-name" locale={locale}>
          <Input id="ps-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} />
        </Field>
        <Field label={t.lab} htmlFor="ps-lab" locale={locale}>
          <Select id="ps-lab" value={labId} onChange={(e) => setLabId(e.target.value)}>
            {labs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {l.region}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

export function PriceSheetRowActions({ sheet }: { sheet: PriceSheetSummary }) {
  const router = useRouter();
  const { run } = useAction();
  const t = useMessages(priceSheetMsgs).row;
  return (
    <Menu
      label={t.actions}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={t.actionsFor(sheet.name)}>
          <Ellipsis />
        </Button>
      }
      items={[
        { label: t.edit, icon: <Pencil />, href: `/price-sheets/${sheet.id}` },
        { label: t.duplicate, icon: <Copy />, onSelect: () => run(() => duplicatePriceSheet(sheet.id), { success: t.duplicated, onSuccess: (s) => router.push(`/price-sheets/${s.id}`) }) },
        sheet.archived
          ? { label: t.restore, icon: <ArchiveRestore />, onSelect: () => run(() => updatePriceSheet(sheet.id, { archived: false }), { success: t.restored }) }
          : {
              label: sheet.jobsUsing > 0 ? t.archiveUsed(sheet.jobsUsing) : t.archive,
              icon: <Archive />,
              onSelect: () => run(() => updatePriceSheet(sheet.id, { archived: true }), { success: t.archivedToast, description: t.archivedBody }),
            },
      ]}
    />
  );
}
