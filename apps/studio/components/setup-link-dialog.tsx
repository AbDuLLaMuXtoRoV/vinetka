"use client";

import type { SetupLink } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { useFormatters, useMessages } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { CopyField } from "@/components/copy-field";
import { setupMsgs } from "@/messages/setup";

/** Shows a one-time setup link to pass on (email, Telegram…) after an invite or a "New setup link". */
export function SetupLinkDialog({ name, link, onClose }: { name: string; link: SetupLink | null; onClose: () => void }) {
  const t = useMessages(setupMsgs);
  const fmt = useFormatters();
  return (
    <Modal
      open={link !== null}
      onOpenChange={(open) => !open && onClose()}
      title={t.linkTitle(name)}
      description={link ? t.linkBody(name, fmt.date(link.expiresAt)) : undefined}
      footer={<Button onClick={onClose}>{t.done}</Button>}
    >
      {link && (
        <div className="grid gap-3">
          <CopyField value={link.url} label={t.linkLabel} />
          <p className="text-xs text-muted">{t.linkEmailNote}</p>
        </div>
      )}
    </Modal>
  );
}
