"use client";

import type { Organization, OrganizationInput, OrganizationType } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useLocale } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { Select } from "@snapbell/ui/select";
import { useState, type ReactNode } from "react";
import { useAction } from "@/components/use-action";
import { useLabels } from "@/components/use-labels";
import { createOrganization, updateOrganization } from "@/lib/actions";
import { orgMsgs } from "@/messages/organizations";

/** Create or edit an organization in a modal. */
export function OrganizationDialog({ trigger, organization, onSaved }: { trigger: ReactNode; organization?: Organization; onSaved?: (org: Organization) => void }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = orgMsgs[locale].dialog;
  const { orgTypes } = useLabels();
  const [form, setForm] = useState<OrganizationInput>({
    name: organization?.name ?? "",
    type: organization?.type ?? "school",
    contactName: organization?.contactName ?? "",
    contactEmail: organization?.contactEmail ?? "",
    contactPhone: organization?.contactPhone ?? null,
    address: organization?.address ?? null,
  });
  const set = <K extends keyof OrganizationInput>(k: K, v: OrganizationInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={organization ? t.editTitle : t.newTitle}
      description={t.description}
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.cancel}
          </Button>
          <Button
            loading={pending}
            disabled={!form.name.trim() || !form.contactEmail.includes("@")}
            onClick={() =>
              run(() => (organization ? updateOrganization(organization.id, form) : createOrganization(form)), {
                success: organization ? t.saved : t.added,
                onSuccess: (org) => {
                  setOpen(false);
                  onSaved?.(org);
                },
              })
            }
          >
            {t.save}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label={t.name} htmlFor="org-name" locale={locale}>
          <Input id="org-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label={t.type} htmlFor="org-type" locale={locale}>
          <Select id="org-type" value={form.type} onChange={(e) => set("type", e.target.value as OrganizationType)}>
            {Object.entries(orgTypes).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.contactName} htmlFor="org-contact" locale={locale}>
            <Input id="org-contact" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
          </Field>
          <Field label={t.contactEmail} htmlFor="org-email" locale={locale}>
            <Input id="org-email" type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          </Field>
        </div>
        <Field label={t.contactPhone} htmlFor="org-phone" optional locale={locale}>
          <Input id="org-phone" type="tel" value={form.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value || null)} />
        </Field>
      </div>
    </Modal>
  );
}
