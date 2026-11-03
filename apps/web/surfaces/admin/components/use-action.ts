"use client";

import { useMessages } from "@snapbell/ui/locale";
import { useToast } from "@snapbell/ui/toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ActionResult } from "@admin/lib/api";
import { adminMsgs } from "@admin/messages/admin";

export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useMessages(adminMsgs);
  function run<T>(action: () => Promise<ActionResult<T>>, opts: { success?: string; onSuccess?: (data: T) => void } = {}) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (opts.success) toast({ title: opts.success, tone: "success" });
        opts.onSuccess?.(result.data);
        router.refresh();
      } else toast({ title: t.actionFailed, description: result.error, tone: "danger" });
    });
  }
  return { run, pending };
}
