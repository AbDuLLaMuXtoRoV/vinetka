"use client";

import type { Member, Role } from "@snapbell/sdk";
import { Avatar } from "@snapbell/ui/avatar";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody } from "@snapbell/ui/card";
import { Field } from "@snapbell/ui/field";
import { Input } from "@snapbell/ui/input";
import { useLocale } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { RadioGroup } from "@snapbell/ui/radio-group";
import { Select } from "@snapbell/ui/select";
import { ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { useAction } from "@/components/use-action";
import { inviteMember, updateMemberRole } from "@/lib/actions";
import { useLabels } from "@/components/use-labels";
import { settingsMsgs } from "@/messages/settings";

export function TeamSection({ members, me }: { members: Member[]; me: Member }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = settingsMsgs[locale].team;
  const { roles: roleLabels } = useLabels();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("photographer");
  const isOwner = me.role === "owner";
  const canInvite = me.role !== "photographer";

  return (
    <Card>
      <CardBody className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t.title}</h2>
            <p className="text-sm text-muted">{t.body}</p>
          </div>
          {canInvite && (
            <Modal
              open={open}
              onOpenChange={setOpen}
              trigger={
                <Button>
                  <UserPlus /> {t.invite}
                </Button>
              }
              title={t.inviteTitle}
              description={t.inviteBody}
              footer={
                <>
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    {t.cancel}
                  </Button>
                  <Button
                    loading={pending}
                    disabled={!email.includes("@") || !name.trim()}
                    onClick={() =>
                      run(() => inviteMember({ email: email.trim(), name: name.trim(), role }), {
                        success: t.inviteSent,
                        description: email,
                        onSuccess: () => {
                          setOpen(false);
                          setEmail("");
                          setName("");
                        },
                      })
                    }
                  >
                    {t.sendInvite}
                  </Button>
                </>
              }
            >
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t.name} htmlFor="inv-name" locale={locale}>
                    <Input id="inv-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field label={t.email} htmlFor="inv-email" locale={locale}>
                    <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                </div>
                <RadioGroup
                  name="inv-role"
                  value={role}
                  onValueChange={(v) => setRole(v as Role)}
                  options={(["admin", "photographer"] as Role[]).map((r) => ({ value: r, label: roleLabels[r], description: t.roleHelp[r] }))}
                />
              </div>
            </Modal>
          )}
        </div>
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {m.name}
                  {m.id === me.id && <Badge tone="outline">{t.you}</Badge>}
                  {m.status === "invited" && <Badge tone="warning">{t.pending}</Badge>}
                  {m.twoFactorEnabled && (
                    <Badge tone="success">
                      <ShieldCheck /> 2FA
                    </Badge>
                  )}
                </p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>
              {isOwner && m.role !== "owner" ? (
                <Select
                  aria-label={t.roleFor(m.name)}
                  value={m.role}
                  wrapperClassName="w-40"
                  className="h-9"
                  onChange={(e) => run(() => updateMemberRole(m.id, e.target.value as Role), { success: t.roleChanged(m.name, roleLabels[e.target.value as Role]) })}
                >
                  <option value="admin">{roleLabels.admin}</option>
                  <option value="photographer">{roleLabels.photographer}</option>
                </Select>
              ) : (
                <Badge tone={m.role === "owner" ? "accent" : "neutral"}>{roleLabels[m.role]}</Badge>
              )}
            </li>
          ))}
        </ul>
        {isOwner && !me.twoFactorEnabled && (
          <p className="flex items-start gap-2 rounded-input bg-sunken p-3 text-sm text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t.twoFactor}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
