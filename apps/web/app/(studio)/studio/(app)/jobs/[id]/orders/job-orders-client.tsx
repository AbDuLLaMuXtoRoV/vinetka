"use client";

import type { Job, OrderSummary } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody } from "@snapbell/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { EmptyState } from "@snapbell/ui/feedback";
import { useFormatters, useMessages } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { Download, ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAction } from "@studio/components/use-action";
import { releaseBulkBatch } from "@studio/lib/actions";
import { downloadText, toCsv } from "@studio/lib/csv";
import { useLabels } from "@studio/components/use-labels";
import { jobOrdersMsgs } from "@studio/messages/job-orders";

type Batch = { id: string; orders: number; status: "collecting" | "released" | "shipped"; releasedAt: string | null };

export function JobOrdersClient({ job, orders, batches }: { job: Job; orders: OrderSummary[]; batches: Batch[] }) {
  const { run, pending } = useAction();
  const t = useMessages(jobOrdersMsgs);
  const fmt = useFormatters();
  const { orderStatus } = useLabels();
  const [releasing, setReleasing] = useState<Batch | null>(null);

  const exportCsv = () =>
    downloadText(
      `${job.name.replace(/[^\w]+/g, "-").toLowerCase()}-orders.csv`,
      // Machine-readable: English headers and status codes, so imports and spreadsheets read them reliably.
      toCsv(
        ["Order", "Date", "Customer", "Children", "Items", "Total", "Status"],
        orders.map((o) => [o.number, o.createdAt.slice(0, 10), o.customerName, o.subjectNames.join("; "), o.itemCount, (o.totalCents / 100).toFixed(2), o.status]),
      ),
    );

  return (
    <div className="grid gap-6">
      {job.shipping.schoolPickup && (
        <Card>
          <CardBody className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <Truck className="size-5" aria-hidden /> {t.bulk}
                </h2>
                <p className="text-sm text-muted">{t.bulkBody(job.deadline ? fmt.date(job.deadline) : null)}</p>
              </div>
            </div>
            {batches.length === 0 ? (
              <p className="text-sm text-muted">{t.noBulk}</p>
            ) : (
              <ul className="divide-y divide-border rounded-input border border-border">
                {batches.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="font-mono text-xs text-muted">{b.id}</span>
                    <span className="text-sm">{t.orders(b.orders)}</span>
                    <Badge tone={b.status === "collecting" ? "warning" : b.status === "released" ? "sage" : "success"}>
                      {b.status === "collecting" ? t.collecting : b.status === "released" ? t.released(b.releasedAt ? fmt.dateTime(b.releasedAt) : "") : t.shipped}
                    </Badge>
                    {b.status === "collecting" && (
                      <Button size="sm" className="ml-auto" onClick={() => setReleasing(b)} disabled={b.orders === 0}>
                        {t.release}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t.orders(orders.length)}</h2>
        <Button variant="outline" onClick={exportCsv} disabled={orders.length === 0}>
          <Download /> {t.exportCsv}
        </Button>
      </div>
      {orders.length === 0 ? (
        <EmptyState icon={<ShoppingBag />} title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>{t.colOrder}</TH>
              <TH>{t.colCustomer}</TH>
              <TH>{t.colChildren}</TH>
              <TH align="right">{t.colItems}</TH>
              <TH align="right">{t.colTotal}</TH>
              <TH>{t.colStatus}</TH>
              <TH>{t.colDate}</TH>
            </tr>
          </THead>
          <TBody>
            {orders.map((o) => (
              <TR key={o.id}>
                <TD>
                  <Link href={`/studio/orders/${o.id}`} className="font-mono text-sm font-medium hover:underline">
                    {o.number}
                  </Link>
                </TD>
                <TD>{o.customerName}</TD>
                <TD className="text-muted">{o.subjectNames.join(", ")}</TD>
                <TD align="right">{o.itemCount}</TD>
                <TD align="right">{fmt.money(o.totalCents)}</TD>
                <TD>
                  <Badge tone={orderStatus[o.status].tone}>{orderStatus[o.status].label}</Badge>
                </TD>
                <TD className="whitespace-nowrap text-muted">{fmt.date(o.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Modal
        open={releasing !== null}
        onOpenChange={(o) => !o && setReleasing(null)}
        title={t.releaseTitle}
        description={releasing ? t.releaseBody(releasing.orders, job.organizationName) : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReleasing(null)}>
              {t.notYet}
            </Button>
            <Button loading={pending} onClick={() => releasing && run(() => releaseBulkBatch(job.id, releasing.id), { success: t.releasedToast, onSuccess: () => setReleasing(null) })}>
              {t.releaseBatch}
            </Button>
          </>
        }
      />
    </div>
  );
}
