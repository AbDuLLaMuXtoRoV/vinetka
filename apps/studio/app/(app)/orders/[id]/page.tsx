import { formatters } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@snapbell/ui/card";
import { Timeline } from "@snapbell/ui/data";
import { PriceBreakdown } from "@snapbell/ui/commerce/price-breakdown";
import { ExternalLink, Mail, MessageSquare, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { canSeeMoney, getSession, load } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { getLabels } from "@/lib/labels";
import { ordersMsgs } from "@/messages/orders";
import { OrderActions } from "./order-actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: ordersMsgs[await getLocale()].detail.metaTitle };
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member } = await getSession();
  const order = await load((c) => c.orders.get(id));
  const money = canSeeMoney(member.role);
  const refunded = order.refunds.reduce((s, r) => s + r.amountCents, 0);
  const lastDone = order.timeline.map((step) => Boolean(step.at)).lastIndexOf(true);
  const locale = await getLocale();
  const t = ordersMsgs[locale].detail;
  const fmt = formatters(locale);
  const { orderStatus, messageStatus } = getLabels(locale);

  return (
    <>
      <PageHeader
        back={{ href: "/orders", label: t.back }}
        title={t.title(order.number)}
        meta={
          <>
            <Badge tone={orderStatus[order.status].tone}>{orderStatus[order.status].label}</Badge>
            <span className="text-sm text-muted">
              {fmt.dateTime(order.createdAt)} ·{" "}
              <Link href={`/jobs/${order.jobId}`} className="underline">
                {order.jobName}
              </Link>
            </span>
          </>
        }
        actions={<OrderActions order={order} refundableCents={order.split.chargedCents - refunded} canRefund={money} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.labStatus}</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4">
              <Timeline
                orientation="horizontal"
                locale={locale}
                steps={order.timeline.map((step, i) => ({
                  label: t.steps[step.status],
                  detail: step.at ? fmt.dateTime(step.at) : undefined,
                  state: step.at ? (i === lastDone && i < order.timeline.length - 1 ? "current" : "done") : "upcoming",
                }))}
              />
              {order.tracking && (
                <a href={order.tracking.url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 text-sm underline">
                  <Truck className="size-4" aria-hidden /> {order.tracking.carrier} {order.tracking.number}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.items}</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <li key={item.id} className="grid gap-1 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="font-medium">
                        {item.quantity > 1 && <span className="text-muted">{item.quantity} × </span>}
                        {item.name}
                      </p>
                      <span className="tabular-nums">{fmt.money(item.lineTotalCents)}</span>
                    </div>
                    <p className="text-xs text-muted">
                      {item.subjectName} · {t.photos(item.photoIds.length)}
                      {money && <> · {t.labCost(fmt.money(item.labCostCents))}</>}
                    </p>
                    {item.customization && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.customization.crop && <Badge tone="outline">{t.customCrop}</Badge>}
                        {item.customization.background && <Badge tone="outline">{t.background(item.customization.background)}</Badge>}
                        {item.customization.theme && <Badge tone="outline">{t.theme(item.customization.theme)}</Badge>}
                        {item.customization.nameText && <Badge tone="outline">{t.name(item.customization.nameText)}</Badge>}
                        {item.customization.retouch && <Badge tone="accent">{t.retouch}</Badge>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.messages}</CardTitle>
            </CardHeader>
            <CardBody>
              {order.messages.length === 0 ? (
                <p className="text-sm text-muted">{t.noMessages}</p>
              ) : (
                <ul className="grid gap-3">
                  {order.messages.map((m) => (
                    <li key={m.id} className="flex gap-3">
                      {m.channel === "sms" ? <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted" aria-label={t.sms} /> : <Mail className="mt-0.5 size-4 shrink-0 text-muted" aria-label={t.email} />}
                      <div className="grid gap-0.5 text-sm">
                        <p>{m.body}</p>
                        <p className="text-xs text-muted">
                          {m.to} · {fmt.dateTime(m.createdAt)} · <span className={m.status === "failed" ? "text-danger" : undefined}>{messageStatus[m.status]}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{money ? t.paymentPayout : t.payment}</CardTitle>
            </CardHeader>
            <CardBody>
              <PriceBreakdown totals={order.split} mode={money ? "studio" : "customer"} locale={locale} />
              {order.refunds.length > 0 && (
                <div className="mt-4 grid gap-2 border-t border-border pt-4 text-sm">
                  <p className="font-medium">{t.refunds}</p>
                  {order.refunds.map((r) => (
                    <div key={r.id} className="flex justify-between gap-3">
                      <span className="text-muted">
                        {fmt.dateTime(r.createdAt)} · {r.reason}
                      </span>
                      <span className="text-danger tabular-nums">−{fmt.money(r.amountCents)}</span>
                    </div>
                  ))}
                </div>
              )}
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
              <p className="mt-3 font-medium">{order.delivery.method === "school_pickup" ? t.schoolPickup : t.shipHome}</p>
              {order.delivery.address && (
                <p className="text-muted">
                  {order.delivery.address.line1}
                  {order.delivery.address.line2 && `, ${order.delivery.address.line2}`}
                  <br />
                  {order.delivery.address.city}, {order.delivery.address.state} {order.delivery.address.postalCode}
                </p>
              )}
            </CardBody>
          </Card>

          {order.reprints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t.reprints}</CardTitle>
              </CardHeader>
              <CardBody className="grid gap-2 text-sm">
                {order.reprints.map((r) => (
                  <div key={r.id} className="flex justify-between gap-3">
                    <span>
                      {t.reprintItems(r.itemIds.length)} · {r.reason}
                    </span>
                    <Badge tone="sage">{t.reprintStatus[r.status] ?? r.status}</Badge>
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
