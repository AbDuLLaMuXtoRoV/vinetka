"use client";

import { Button } from "@snapbell/ui/button";
import { useMessages } from "@snapbell/ui/locale";
import { Download } from "lucide-react";
import { useAction } from "@/components/use-action";
import { reportCsv } from "@/lib/actions";
import { downloadText } from "@/lib/csv";
import { reportsMsgs } from "@/messages/reports";

export function CsvButton({ from, to }: { from: string; to: string }) {
  const { run, pending } = useAction();
  const t = useMessages(reportsMsgs);
  return (
    <Button variant="outline" loading={pending} onClick={() => run(() => reportCsv({ from, to }), { refresh: false, onSuccess: (r) => downloadText(r.filename, r.csv) })}>
      <Download /> {t.csv}
    </Button>
  );
}
