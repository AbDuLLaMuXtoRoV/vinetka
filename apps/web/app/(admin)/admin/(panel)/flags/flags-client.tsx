"use client";

import type { FeatureFlag } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Card, CardBody } from "@snapbell/ui/card";
import { Chip } from "@snapbell/ui/chip";
import { useMessages } from "@snapbell/ui/locale";
import { Switch } from "@snapbell/ui/switch";
import { Check } from "lucide-react";
import { useAction } from "@admin/components/use-action";
import { updateFlag } from "@admin/lib/actions";
import { adminMsgs } from "@admin/messages/admin";

export function FlagsClient({ flags, studios }: { flags: FeatureFlag[]; studios: Array<{ id: string; name: string }> }) {
  const { run } = useAction();
  const t = useMessages(adminMsgs).flags;
  return (
    <ul className="grid gap-3">
      {flags.map((f) => (
        <li key={f.key}>
          <Card>
            <CardBody className="grid gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  <p className="font-mono text-sm font-semibold">{f.key}</p>
                  <p className="text-sm text-muted">{f.description}</p>
                </div>
                <Switch
                  id={`flag-${f.key}`}
                  aria-label={t.enabled(f.key)}
                  checked={f.enabled}
                  onCheckedChange={(v) => run(() => updateFlag(f.key, { enabled: v }), { success: t.toggled(f.key, v) })}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">{t.studios}</span>
                {f.studioIds.length === 0 ? <Badge tone={f.enabled ? "success" : "outline"}>{t.allStudios}</Badge> : null}
                {studios.map((s) => {
                  const on = f.studioIds.includes(s.id);
                  return (
                    <Chip
                      key={s.id}
                      selected={on}
                      onClick={() => run(() => updateFlag(f.key, { studioIds: on ? f.studioIds.filter((x) => x !== s.id) : [...f.studioIds, s.id] }), { success: t.targeting })}
                    >
                      {on && <Check />}
                      {s.name}
                    </Chip>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
