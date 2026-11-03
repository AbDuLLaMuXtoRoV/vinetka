"use client";

import { useMessages } from "@snapbell/ui/locale";
import { useToast } from "@snapbell/ui/toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ActionResult } from "@studio/lib/result";
import { commonMsgs } from "@studio/messages/common";

/** Runs a server action with a pending state, toasts the outcome and refreshes server data. */
export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useMessages(commonMsgs);

  function run<T>(
    action: () => Promise<ActionResult<T>>,
    opts: { success?: string; description?: string; refresh?: boolean; onSuccess?: (data: T) => void; onError?: (error: string) => void } = {},
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (opts.success) toast({ title: opts.success, description: opts.description, tone: "success" });
        opts.onSuccess?.(result.data);
        if (opts.refresh !== false) router.refresh();
      } else {
        toast({ title: t.actionFailed, description: result.error, tone: "danger" });
        opts.onError?.(result.error);
      }
    });
  }

  return { run, pending };
}
