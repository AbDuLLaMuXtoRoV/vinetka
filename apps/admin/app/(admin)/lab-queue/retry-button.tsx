"use client";

import { Button } from "@snapbell/ui/button";
import { useMessages } from "@snapbell/ui/locale";
import { RotateCcw } from "lucide-react";
import { useAction } from "@/components/use-action";
import { retryLabSubmission } from "@/lib/actions";
import { adminMsgs } from "@/messages/admin";

export function RetryButton({ id }: { id: string }) {
  const { run, pending } = useAction();
  const t = useMessages(adminMsgs).lab;
  return (
    <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => retryLabSubmission(id), { success: t.resubmitted })}>
      <RotateCcw /> {t.retry}
    </Button>
  );
}
