import { formatters, type OrderStatus } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterSelect, SearchBar } from "@/components/search-bar";
import { AdminHeader } from "@/components/shell";
import { load } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { getLabels } from "@/lib/labels";
import { adminMsgs } from "@/messages/admin";

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminMsgs[await getLocale()].orders.title };
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "" } = await searchParams;
  const locale = await getLocale();
  const t = adminMsgs[locale].orders;
  const fmt = formatters(locale);
  const { orderStatus } = getLabels(locale);
  const valid = status in orderStatus ? (status as OrderStatus) : undefined;
  const orders = await load((c) => c.admin.orders({ q: q || undefined, status: valid }));
  return (
    <>
      <AdminHeader title={t.title} description={t.description} />
      <SearchBar q={q} placeholder={t.placeholder} locale={locale}>
        <FilterSelect name="status" value={valid ?? ""} label={t.colStatus} locale={locale} options={Object.entries(orderStatus).map(([k, v]) => [k, v.label])} />
      </SearchBar>
      <Table>
        <THead>
          <tr>
            <TH>{t.colOrder}</TH>
            <TH>{t.colStudio}</TH>
            <TH>{t.colCustomer}</TH>
            <TH>{t.colJob}</TH>
            <TH align="right">{t.colTotal}</TH>
            <TH>{t.colStatus}</TH>
            <TH>{t.colPlaced}</TH>
          </tr>
        </THead>
        <TBody>
          {orders.map((o) => (
            <TR key={o.id}>
              <TD>
                <Link href={`/orders/${o.id}`} className="font-mono text-sm font-medium hover:underline">
                  {o.number}
                </Link>
              </TD>
              <TD>{o.studioName}</TD>
              <TD>
                {o.customerName}
                <span className="block text-xs text-muted">{o.subjectNames.join(", ")}</span>
              </TD>
              <TD className="text-muted">{o.jobName}</TD>
              <TD align="right">{fmt.money(o.totalCents)}</TD>
              <TD>
                <Badge tone={orderStatus[o.status].tone}>{orderStatus[o.status].label}</Badge>
              </TD>
              <TD className="whitespace-nowrap text-muted">{fmt.dateTime(o.createdAt)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {orders.length === 0 && <p className="mt-4 text-sm text-muted">{t.empty}</p>}
    </>
  );
}
