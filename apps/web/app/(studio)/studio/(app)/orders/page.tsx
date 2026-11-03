import { formatters, type OrderStatus } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { EmptyState } from "@snapbell/ui/feedback";
import { Input } from "@snapbell/ui/input";
import { cn } from "@snapbell/ui/lib/cn";
import { Search, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@studio/components/page-header";
import { load } from "@studio/lib/api";
import { getLocale } from "@studio/lib/i18n";
import { getLabels } from "@studio/lib/labels";
import { ordersMsgs } from "@studio/messages/orders";

export async function generateMetadata(): Promise<Metadata> {
  return { title: ordersMsgs[await getLocale()].list.title };
}

const STATUSES: Array<OrderStatus | ""> = ["", "paid", "at_lab", "shipped", "delivered", "refunded", "partially_refunded"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; jobId?: string }> }) {
  const { q = "", status = "", jobId = "" } = await searchParams;
  const valid = (STATUSES as string[]).includes(status) ? (status as OrderStatus | "") : "";
  const [orders, jobs] = await Promise.all([load((c) => c.orders.list({ q: q || undefined, status: valid || undefined, jobId: jobId || undefined })), load((c) => c.jobs.list())]);
  const locale = await getLocale();
  const t = ordersMsgs[locale].list;
  const fmt = formatters(locale);
  const { orderStatus } = getLabels(locale);
  const href = (s: string) => `/studio/orders?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}), ...(jobId ? { jobId } : {}) })}`;

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <div className="mb-4 grid gap-3">
        <form className="flex flex-wrap gap-2" role="search">
          {valid && <input type="hidden" name="status" value={valid} />}
          <div className="relative min-w-60 flex-1 md:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input name="q" defaultValue={q} placeholder={t.searchPlaceholder} aria-label={t.searchLabel} className="pl-9" />
          </div>
          <select name="jobId" defaultValue={jobId} aria-label={t.filterJob} className="h-11 rounded-input border border-border bg-surface px-3 text-sm">
            <option value="">{t.allJobs}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.organizationName} · {j.name}
              </option>
            ))}
          </select>
          <button type="submit" className="h-11 rounded-input bg-ink px-4 text-sm font-medium text-bg">
            {t.search}
          </button>
        </form>
        <nav aria-label={t.filterStatus} className="flex gap-1 overflow-x-auto">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={href(s)}
              aria-current={valid === s ? "page" : undefined}
              className={cn("rounded-full border px-3 py-1.5 text-sm whitespace-nowrap", valid === s ? "border-ink bg-ink text-bg" : "border-border text-muted hover:text-ink")}
            >
              {s ? orderStatus[s].label : t.all}
            </Link>
          ))}
        </nav>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={<ShoppingBag />} title={t.emptyTitle} description={q || valid || jobId ? t.emptyFiltered : t.emptyBody} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>{t.colOrder}</TH>
              <TH>{t.colCustomer}</TH>
              <TH>{t.colChildren}</TH>
              <TH>{t.colJob}</TH>
              <TH align="right">{t.colItems}</TH>
              <TH align="right">{t.colTotal}</TH>
              <TH>{t.colStatus}</TH>
              <TH>{t.colPlaced}</TH>
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
                <TD className="text-muted">{o.jobName}</TD>
                <TD align="right">{o.itemCount}</TD>
                <TD align="right">{fmt.money(o.totalCents)}</TD>
                <TD>
                  <Badge tone={orderStatus[o.status].tone}>{orderStatus[o.status].label}</Badge>
                </TD>
                <TD className="whitespace-nowrap text-muted">{fmt.dateTime(o.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="mt-3 text-xs text-muted">{t.count(orders.length)}</p>
    </>
  );
}
