"use client";

import { Button } from "@snapbell/ui/button";
import { useMessages } from "@snapbell/ui/locale";
import { useToast } from "@snapbell/ui/toast";
import { RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { reorder } from "@/app/actions";
import { miscMsgs } from "@/messages/misc";

export function ReorderButton({ orderId }: { orderId: string }) {
  const toast = useToast();
  const t = useMessages(miscMsgs);
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="lg"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await reorder(orderId);
          if (res && !res.ok) toast({ title: t.reorderFailed, description: res.message, tone: "danger" });
        })
      }
    >
      <RotateCcw aria-hidden /> {t.reorder}
    </Button>
  );
}
