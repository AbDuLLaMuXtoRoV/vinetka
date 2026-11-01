"use client";

import type { SetupLink } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { inputClass } from "@snapbell/ui/input";
import { cn } from "@snapbell/ui/lib/cn";
import { useFormatters, useMessages } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { onboardingMsgs } from "@/messages/onboarding";

/**
 * The owner's one-time setup link, to send by email or Telegram.
 * `studioName` switches the title to "{studio} is ready" right after creation.
 */
export function SetupLinkDialog({
  name,
  studioName,
  link,
  onClose,
}: {
  name: string;
  studioName?: string;
  link: SetupLink | null;
  onClose: () => void;
}) {
  const t = useMessages(onboardingMsgs);
  const fmt = useFormatters();
  const [copied, setCopied] = useState(false);

  return (
    <Modal
      open={link !== null}
      onOpenChange={(open) => !open && onClose()}
      title={studioName ? t.link.createdTitle(studioName) : t.link.title(name)}
      description={link ? t.link.body(name, fmt.date(link.expiresAt)) : undefined}
      footer={<Button onClick={onClose}>{t.done}</Button>}
    >
      {link && (
        <div className="grid gap-3">
          <div className="flex gap-2">
            <input
              readOnly
              value={link.url}
              aria-label={t.link.label}
              onFocus={(e) => e.target.select()}
              className={cn(inputClass, "font-mono text-xs md:text-xs")}
            />
            <Button
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(link.url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? t.copied : t.copy}
            </Button>
          </div>
          <p className="text-xs text-muted">{t.link.emailNote}</p>
        </div>
      )}
    </Modal>
  );
}
