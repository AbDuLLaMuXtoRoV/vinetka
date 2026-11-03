import { formatters } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@snapbell/ui/card";
import { PriceBreakdown } from "@snapbell/ui/commerce/price-breakdown";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@admin/components/shell";
import { load } from "@admin/lib/api";
import { getLocale } from "@admin/lib/i18n";
import { getLabels } from "@admin/lib/labels";
import { adminMsgs } from "@admin/messages/admin";
import { RefundButton } from "./refund-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminMsgs[await getLocale()].order.metaTitle };
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await load((c) => c.admin.order(id));
  const refunded = order.refunds.reduce((s, r) => s + r.amountCents, 0);
  const locale = await getLocale();
  const t = adminMsgs[locale].order;
  const fmt = formatters(locale);
  const { messageStatus, orderStatus, channel, timeline } = getLabels(locale);

  return (
    <>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {t.back}
      </Link>
      <AdminHeader
        title={t.title(order.number)}
        description={`${order.studioName} · ${order.jobName} · ${fmt.dateTime(order.createdAt)}`}
        actions={<RefundButton orderId={order.id} number={order.number} refundableCents={order.split.chargedCents - refunded} />}
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t.status} <Badge tone={orderStatus[order.status].tone}>{orderStatus[order.status].label}</Badge>
              </CardTitle>
            </CardHeader>
            <CardBody className="grid gap-1 text-sm">
              {order.timeline.map((step) => (
                <p key={step.status} className={step.at ? "" : "text-muted"}>
                  {timeline[step.status]}: {step.at ? fmt.dateTime(step.at) : "—"}
                </p>
              ))}
              {order.tracking && (
                <p className="mt-2">
                  {t.tracking} {order.tracking.carrier} <span className="font-mono">{order.tracking.number}</span>
                </p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.items}</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="divide-y divide-border text-sm">
                {order.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3 py-2">
                    <span>
                      {i.quantity} × {i.name} <span className="text-muted">· {i.subjectName}</span>
                    </span>
                    <span className="tabular-nums">{fmt.money(i.lineTotalCents)}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.messages}</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-2 text-sm">
              {order.messages.length === 0 && <p className="text-muted">{t.none}</p>}
              {order.messages.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center gap-2">
                  <Badge tone={messageStatus[m.status].tone}>{messageStatus[m.status].label}</Badge>
                  <span className="text-muted">{channel[m.channel]}</span>
                  <span className="font-mono text-xs">{m.template}</span>
                  <span className="text-muted">→ {m.to}</span>
                  <span className="ml-auto text-xs text-muted">{fmt.dateTime(m.createdAt)}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.money}</CardTitle>
            </CardHeader>
            <CardBody>
              <PriceBreakdown totals={order.split} mode="studio" locale={locale} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.customer}</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-1 text-sm">
              <p className="font-medium">{order.contact.name}</p>
              <p className="text-muted">{order.contact.email}</p>
              {order.contact.phone && <p className="text-muted">{order.contact.phone}</p>}
              <p className="mt-2 font-mono text-xs text-muted">{t.parent} {order.parentId}</p>
            </CardBody>
          </Card>
          {order.refunds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t.refunds}</CardTitle>
              </CardHeader>
              <CardBody className="grid gap-2 text-sm">
                {order.refunds.map((r) => (
                  <div key={r.id} className="flex justify-between gap-3">
                    <span className="text-muted">
                      {fmt.dateTime(r.createdAt)} · {r.reason}
                    </span>
                    <span className="text-danger tabular-nums">−{fmt.money(r.amountCents)}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
