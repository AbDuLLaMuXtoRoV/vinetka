import { formatters } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { StatCard, Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import type { Metadata } from "next";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { AdminHeader } from "@/components/shell";
import { load } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { getLabels } from "@/lib/labels";
import { adminMsgs } from "@/messages/admin";

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminMsgs[await getLocale()].studios.title };
}

export default async function StudiosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = await load((c) => c.admin.studios({ q: q || undefined }));
  const sales = rows.reduce((s, r) => s + r.salesCents, 0);
  const fees = rows.reduce((s, r) => s + r.platformFeesCents, 0);
  const locale = await getLocale();
  const t = adminMsgs[locale].studios;
  const fmt = formatters(locale);
  const { stripeStatus } = getLabels(locale);

  return (
    <>
      <AdminHeader title={t.title} description={t.description} />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label={t.count} value={fmt.number(rows.length)} footer={<p className="text-xs text-muted">{t.withoutStripe(rows.filter((r) => r.studio.stripeStatus !== "active").length)}</p>} />
        <StatCard label={t.sales} value={fmt.money(sales, { whole: true })} />
        <StatCard label={t.fees} value={fmt.money(fees, { whole: true })} />
      </div>
      <SearchBar q={q} placeholder={t.placeholder} locale={locale} />
      <Table>
        <THead>
          <tr>
            <TH>{t.colStudio}</TH>
            <TH>{t.colOwner}</TH>
            <TH>{t.colStripe}</TH>
            <TH align="right">{t.colJobs}</TH>
            <TH align="right">{t.colSales}</TH>
            <TH align="right">{t.colFees}</TH>
            <TH>{t.colJoined}</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.studio.id}>
              <TD>
                <span className="font-medium">{r.studio.name}</span>
                <span className="block font-mono text-xs text-muted">{r.studio.slug}</span>
              </TD>
              <TD className="text-muted">{r.ownerEmail}</TD>
              <TD>
                <Badge tone={stripeStatus[r.studio.stripeStatus].tone}>{stripeStatus[r.studio.stripeStatus].label}</Badge>
              </TD>
              <TD align="right">
                <Link href={`/jobs?q=${encodeURIComponent(r.studio.name)}`} className="hover:underline">
                  {r.jobs} <span className="text-muted">{t.live(r.liveJobs)}</span>
                </Link>
              </TD>
              <TD align="right">{fmt.money(r.salesCents)}</TD>
              <TD align="right">{fmt.money(r.platformFeesCents)}</TD>
              <TD className="text-muted">{fmt.date(r.studio.createdAt)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  );
}
