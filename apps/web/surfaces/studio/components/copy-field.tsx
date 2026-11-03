"use client";

import { Button } from "@snapbell/ui/button";
import { inputClass } from "@snapbell/ui/input";
import { cn } from "@snapbell/ui/lib/cn";
import { useMessages } from "@snapbell/ui/locale";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { commonMsgs } from "@studio/messages/common";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const t = useMessages(commonMsgs);
  return (
    <div className="flex gap-2">
      <input readOnly value={value} aria-label={label} onFocus={(e) => e.target.select()} className={cn(inputClass, "font-mono text-xs md:text-xs")} />
      <Button
        variant="secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? t.copied : t.copy}
      </Button>
    </div>
  );
}
