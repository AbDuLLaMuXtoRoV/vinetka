"use client";

import { useMessages } from "@snapbell/ui/locale";
import { EyeOff } from "lucide-react";
import { photoMsgs } from "@/messages/photos";

/** Shown over blurred photos while the page is out of focus. */
export function ProtectionVeil({ visible }: { visible: boolean }) {
  const t = useMessages(photoMsgs);
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-bg/60 p-6 text-center" role="status">
      <div className="grid justify-items-center gap-2">
        <EyeOff className="size-8 text-muted" aria-hidden />
        <p className="font-medium">{t.hiddenTitle}</p>
        <p className="text-sm text-muted">{t.hiddenBody}</p>
      </div>
    </div>
  );
}
