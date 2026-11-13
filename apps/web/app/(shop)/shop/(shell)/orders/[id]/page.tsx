import { formatters } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { PriceBreakdown } from "@snapbell/ui/commerce/price-breakdown";
import { Timeline, type TimelineStep } from "@snapbell/ui/data";
import { Alert } from "@snapbell/ui/feedback";
import { CircleCheck, Download, ExternalLink, School, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoadErrorView } from "@shop/components/load-error";
import { OrderPlacedTracker } from "@shop/components/order-placed-tracker";
import { ReorderButton } from "@shop/components/reorder-button";
import { absoluteApiUrl, load } from "@shop/lib/api";
import { photoThumbs } from "@shop/lib/thumbs";
import { getLocale } from "@shop/lib/i18n";
import { metaMsgs } from "@shop/messages/meta";
import { serverMsgs } from "@shop/messages/server";
import { statusMsgs } from "@shop/messages/status";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].order };
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const placed = (await searchParams).placed === "1";
  const res = await load((c) => c.orders.get(id));
  if (!res.ok) return <LoadErrorView error={res.error} />;
  const order = res.data;
  const thumbs = await photoThumbs(order.items.map((i) => i.albumCode));
  const locale = await getLocale();
  const t = serverMsgs[locale].order;
  const status = statusMsgs[locale];
  const fmt = formatters(locale);

  const firstPending = order.timeline.findIndex((s) => !s.at);
  const steps: TimelineStep[] = order.timeline.map((s, i) => ({
    label: status[s.status],
    detail: s.at
      ? fmt.dateTime(s.at)
      : s.status === "shipped" && order.delivery.method === "school_pickup"
        ? t.schoolDelivery
        : undefined,
    state: s.at ? "done" : i === firstPending ? "current" : "upcoming",
  }));
  const refunded = order.status === "refunded" || order.status === "partially_refunded";
  const albumCode = order.items[0]?.albumCode;
  const firstName = order.contact.name.split(" ")[0] || null;

  return (
    <div className="mx-auto grid grid-cols-1 max-w-3xl gap-8 px-4 pt-6 pb-12">
      {placed && <OrderPlacedTracker orderId={order.id} totalCents={order.split.chargedCents} />}
      <header className="grid grid-cols-1 gap-3">
        {placed ? (
          <div className="flex items-center gap-3">
            <CircleCheck className="size-9 shrink-0 text-success" aria-hidden />
            <div>
              <h1 className="text-xl font-semibold md:text-2xl">{t.thanks(firstName)}</h1>
              <p className="text-sm text-muted">{t.receipt(order.contact.email)}</p>
            </div>
          </div>
        ) : (
          <h1 className="text-xl font-semibold md:text-2xl">{t.yourOrder}</h1>
        )}
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span>
            {t.order} <strong className="font-mono">{order.number}</strong>
          </span>
          <span className="text-muted">
            · {fmt.date(order.createdAt)} · {order.studioName}
          </span>
          {refunded && <Badge tone="warning">{status[order.status]}</Badge>}
        </p>
      </header>

      {refunded &&
        order.refunds.map((r) => (
          <Alert key={r.id} tone="info" title={t.refunded(fmt.money(r.amountCents))}>
            {r.reason} · {fmt.date(r.createdAt)}. {t.refundNote}
          </Alert>
        ))}

      <section aria-labelledby="track-h" className="grid grid-cols-1 gap-5 rounded-card border border-border bg-surface p-5 md:p-6">
        <h2 id="track-h" className="flex items-center gap-2 text-base font-semibold">
          {order.delivery.method === "school_pickup" ? <School className="size-5" aria-hidden /> : <Truck className="size-5" aria-hidden />}
          {order.delivery.method === "school_pickup" ? t.toSchool : t.toYou}
        </h2>
        <Timeline steps={steps} orientation="horizontal" className="hidden md:grid" locale={locale} />
        <Timeline steps={steps} className="md:hidden" locale={locale} />
        {order.tracking ? (
          <Button variant="outline" asChild className="w-fit">
            <a href={order.tracking.url} target="_blank" rel="noreferrer">
              {t.track(order.tracking.carrier)} <ExternalLink aria-hidden />
            </a>
          </Button>
        ) : order.delivery.address ? (
          <p className="text-sm text-muted">
            {t.shipsTo(`${order.delivery.address.line1}, ${order.delivery.address.city}, ${order.delivery.address.state}`)}
          </p>
        ) : null}
      </section>

      {order.downloads.length > 0 && (
        <section aria-labelledby="dl-h" className="grid grid-cols-1 gap-3">
          <h2 id="dl-h" className="text-base font-semibold">
            {t.downloadsReady}
          </h2>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {order.downloads.map((d) => (
              <li key={d.url} className="flex items-center justify-between gap-3 p-4">
                <span className="min-w-0 truncate text-sm">{d.name}</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={absoluteApiUrl(d.url)} download>
                    <Download aria-hidden /> {t.download}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="items-h" className="grid grid-cols-1 gap-4 rounded-card border border-border bg-surface p-5 md:p-6">
        <h2 id="items-h" className="text-base font-semibold">
          {t.items}
        </h2>
        <ul className="grid grid-cols-1 gap-4">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4">
              {thumbs[item.photoIds[0] ?? ""] ? (
                <img src={thumbs[item.photoIds[0]!]} alt="" draggable={false} className="no-save h-16 w-13 shrink-0 rounded-input object-cover" />
              ) : (
                <span className="h-16 w-13 shrink-0 rounded-input bg-sunken" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {item.quantity > 1 && `${item.quantity} × `}
                  {item.name}
                </p>
                <p className="text-xs text-muted">{item.subjectName}</p>
              </div>
              <p className="text-sm tabular-nums">{fmt.money(item.lineTotalCents)}</p>
            </li>
          ))}
        </ul>
        <PriceBreakdown totals={order.split} locale={locale} />
      </section>

      <div className="flex flex-wrap gap-3">
        {albumCode && (
          <Button asChild size="lg">
            <Link href={`/shop/a/${albumCode}/shop`}>{t.orderMore}</Link>
          </Button>
        )}
        <ReorderButton orderId={order.id} />
      </div>
    </div>
  );
}
