"use client";

import { parseMoney } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Field } from "@snapbell/ui/field";
import { Input, Textarea } from "@snapbell/ui/input";
import { useFormatters, useLocale } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { Undo2 } from "lucide-react";
import { useState } from "react";
import { useAction } from "@admin/components/use-action";
import { refundOrder } from "@admin/lib/actions";
import { adminMsgs } from "@admin/messages/admin";

export function RefundButton({ orderId, number, refundableCents }: { orderId: string; number: string; refundableCents: number }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = adminMsgs[locale].refund;
  const { money } = useFormatters();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState((refundableCents / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const cents = parseMoney(amount.replace(",", ".")) ?? 0;
  const valid = cents > 0 && cents <= refundableCents && reason.trim().length > 2;

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="outline" disabled={refundableCents <= 0}>
          <Undo2 /> {t.button}
        </Button>
      }
      title={t.title(number)}
      description={t.description(money(refundableCents))}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t.cancel}
          </Button>
          <Button
            variant="danger"
            loading={pending}
            disabled={!valid}
            onClick={() =>
              run(() => refundOrder(orderId, { amountCents: cents === refundableCents ? undefined : cents, reason: reason.trim() }), {
                success: t.refunded(money(cents)),
                onSuccess: () => setOpen(false),
              })
            }
          >
            {t.submit(money(cents))}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label={t.amount} htmlFor="ar-amount" locale={locale} error={cents > refundableCents ? t.max(money(refundableCents)) : undefined}>
          <Input id="ar-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={t.reason} htmlFor="ar-reason" locale={locale}>
          <Textarea id="ar-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.placeholder} />
        </Field>
      </div>
    </Modal>
  );
}
