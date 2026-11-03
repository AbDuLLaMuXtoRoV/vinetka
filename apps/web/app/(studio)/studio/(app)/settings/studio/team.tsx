"use client";

import type { Member, Role, SetupLink } from "@snapbell/sdk";
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
import { Link2, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { SetupLinkDialog } from "@studio/components/setup-link-dialog";
import { useAction } from "@studio/components/use-action";
import { inviteMember, newMemberSetupLink, updateMemberRole } from "@studio/lib/actions";
import { useLabels } from "@studio/components/use-labels";
import { settingsMsgs } from "@studio/messages/settings";
import { setupMsgs } from "@studio/messages/setup";

export function TeamSection({ members, me }: { members: Member[]; me: Member }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = settingsMsgs[locale].team;
  const { roles: roleLabels } = useLabels();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("photographer");
  // Setup link to pass on after an invite or a "New setup link".
  const [shared, setShared] = useState<{ name: string; link: SetupLink } | null>(null);
  const ts = setupMsgs[locale];
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
                        onSuccess: ({ member, setupLink }) => {
                          setOpen(false);
                          setEmail("");
                          setName("");
                          setShared({ name: member.name, link: setupLink });
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
              {canInvite && m.status === "invited" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => newMemberSetupLink(m.id), { success: ts.newLinkMade, onSuccess: (link) => setShared({ name: m.name, link }) })}
                >
                  <Link2 /> {ts.newLink}
                </Button>
              )}
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
        <SetupLinkDialog name={shared?.name ?? ""} link={shared?.link ?? null} onClose={() => setShared(null)} />
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
