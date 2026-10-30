"use client";

import { parseMoney, type Order } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Checkbox } from "@snapbell/ui/checkbox";
import { Field } from "@snapbell/ui/field";
import { Input, Textarea } from "@snapbell/ui/input";
import { useFormatters, useLocale } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { RadioGroup } from "@snapbell/ui/radio-group";
import { Printer, Undo2 } from "lucide-react";
import { useState } from "react";
import { useAction } from "@/components/use-action";
import { refundOrder, reprintOrder } from "@/lib/actions";
import { ordersMsgs } from "@/messages/orders";

export function OrderActions({ order, refundableCents, canRefund }: { order: Order; refundableCents: number; canRefund: boolean }) {
  const { run, pending } = useAction();
  const locale = useLocale();
  const t = ordersMsgs[locale].actions;
  const { money } = useFormatters();
  const [refundOpen, setRefundOpen] = useState(false);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [reprintOpen, setReprintOpen] = useState(false);
  const [items, setItems] = useState<Set<string>>(new Set());
  const [reprintReason, setReprintReason] = useState("");

  const partialCents = parseMoney(amount.replace(",", ".")) ?? 0;
  const refundCents = mode === "full" ? refundableCents : partialCents;
  const refundValid = reason.trim().length > 2 && refundCents > 0 && refundCents <= refundableCents;

  return (
    <>
      <Modal
        open={reprintOpen}
        onOpenChange={setReprintOpen}
        trigger={
          <Button variant="outline">
            <Printer /> {t.requestReprint}
          </Button>
        }
        title={t.reprintTitle}
        description={t.reprintBody}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReprintOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              loading={pending}
              disabled={items.size === 0 || reprintReason.trim().length < 3}
              onClick={() => run(() => reprintOrder(order.id, [...items], reprintReason.trim()), { success: t.reprintRequested, onSuccess: () => setReprintOpen(false) })}
            >
              {t.sendToLab}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium">{t.items}</legend>
            {order.items.map((i) => (
              <Checkbox
                key={i.id}
                id={`rp-${i.id}`}
                checked={items.has(i.id)}
                onCheckedChange={(v) =>
                  setItems((cur) => {
                    const next = new Set(cur);
                    if (v === true) next.add(i.id);
                    else next.delete(i.id);
                    return next;
                  })
                }
                label={`${i.quantity > 1 ? `${i.quantity} × ` : ""}${i.name}`}
                description={i.subjectName}
              />
            ))}
          </fieldset>
          <Field label={t.reason} htmlFor="rp-reason" locale={locale}>
            <Textarea id="rp-reason" rows={2} value={reprintReason} onChange={(e) => setReprintReason(e.target.value)} placeholder={t.reprintPlaceholder} />
          </Field>
        </div>
      </Modal>

      {canRefund && (
        <Modal
          open={refundOpen}
          onOpenChange={setRefundOpen}
          trigger={
            <Button variant="outline" disabled={refundableCents <= 0}>
              <Undo2 /> {t.refund}
            </Button>
          }
          title={t.refundTitle(order.number)}
          description={t.refundBody(money(refundableCents))}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRefundOpen(false)}>
                {t.cancel}
              </Button>
              <Button
                variant="danger"
                loading={pending}
                disabled={!refundValid}
                onClick={() =>
                  run(() => refundOrder(order.id, { amountCents: mode === "full" ? undefined : partialCents, reason: reason.trim() }), {
                    success: t.refunded(money(refundCents)),
                    onSuccess: () => setRefundOpen(false),
                  })
                }
              >
                {t.refundButton(refundCents > 0 ? money(refundCents) : "")}
              </Button>
            </>
          }
        >
          <div className="grid gap-4">
            <RadioGroup
              name="refund-mode"
              value={mode}
              onValueChange={(v) => setMode(v as "full" | "partial")}
              options={[
                { value: "full", label: t.full(money(refundableCents)), description: t.fullHint },
                { value: "partial", label: t.partial, description: t.partialHint },
              ]}
            />
            {mode === "partial" && (
              <Field label={t.amount} htmlFor="rf-amount" locale={locale} error={partialCents > refundableCents ? t.max(money(refundableCents)) : undefined}>
                <Input id="rf-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="12.00" />
              </Field>
            )}
            <Field label={t.reason} htmlFor="rf-reason" hint={t.reasonHint} locale={locale}>
              <Textarea id="rf-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
