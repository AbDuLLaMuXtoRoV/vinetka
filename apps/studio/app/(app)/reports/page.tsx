import { formatters } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@snapbell/ui/card";
import { BarChart, StatCard, Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { cn } from "@snapbell/ui/lib/cn";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { load, requireRole } from "@/lib/api";
import { dateInputValue } from "@/lib/dates";
import { getLocale } from "@/lib/i18n";
import { getLabels } from "@/lib/labels";
import { reportsMsgs } from "@/messages/reports";
import { CsvButton } from "./csv-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: reportsMsgs[await getLocale()].title };
}

const PRESETS = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "ytd", days: 0 },
] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  await requireRole(["owner", "admin"]);
  const sp = await searchParams;
  const now = new Date();
  const preset = PRESETS.find((p) => p.key === sp.range) ?? (sp.from ? null : PRESETS[1]!);
  const from = preset
    ? (preset.days ? new Date(now.getTime() - preset.days * 86_400_000) : new Date(now.getFullYear(), 0, 1)).toISOString()
    : new Date(`${sp.from}T00:00:00`).toISOString();
  const to = preset || !sp.to ? now.toISOString() : new Date(`${sp.to}T23:59:59`).toISOString();
  const report = await load((c) => c.reports.get({ from, to }));
  const totals = report.totals;
  const locale = await getLocale();
  const t = reportsMsgs[locale];
  const fmt = formatters(locale);
  const { payoutStatus } = getLabels(locale);

  return (
    <>
      <PageHeader title={t.title} description={t.description} actions={<CsvButton from={from} to={to} />} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Link key={p.key} href={`/reports?range=${p.key}`} className={cn("rounded-full border px-3 py-1.5 text-sm", preset?.key === p.key ? "border-ink bg-ink text-bg" : "border-border text-muted hover:text-ink")}>
            {t.presets[p.key]}
          </Link>
        ))}
        <form className="flex flex-wrap items-center gap-2 md:ml-auto">
          <label className="sr-only" htmlFor="r-from">
            {t.from}
          </label>
          <input id="r-from" type="date" name="from" defaultValue={dateInputValue(from)} className="h-10 rounded-input border border-border bg-surface px-2 text-sm" />
          <span className="text-muted">–</span>
          <label className="sr-only" htmlFor="r-to">
            {t.to}
          </label>
          <input id="r-to" type="date" name="to" defaultValue={dateInputValue(to)} className="h-10 rounded-input border border-border bg-surface px-2 text-sm" />
          <button type="submit" className="h-10 rounded-input border border-ink/70 px-3 text-sm font-medium">
            {t.apply}
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.sales} value={fmt.money(totals.salesCents)} footer={<p className="text-xs text-muted">{t.orders(totals.orders)}</p>} />
        <StatCard label={t.aov} value={fmt.money(totals.aovCents)} />
        <StatCard label={t.fees} value={fmt.money(totals.platformFeesCents + totals.cardFeesCents)} footer={<p className="text-xs text-muted">{t.feesSplit(fmt.money(totals.platformFeesCents), fmt.money(totals.cardFeesCents))}</p>} />
        <StatCard label={t.payout} value={fmt.money(totals.payoutCents)} footer={<p className="text-xs text-muted">{t.payoutAfter(fmt.money(totals.labCostCents), fmt.money(totals.taxCents))}</p>} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t.byDay}</CardTitle>
          </CardHeader>
          <CardBody>
            <BarChart label={t.byDay} data={report.byDay.map((d) => ({ label: fmt.date(d.date, { month: "short", day: "numeric" }), value: d.salesCents }))} format={(n) => fmt.money(n, { whole: true })} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.payouts}</CardTitle>
          </CardHeader>
          <CardBody>
            {report.payouts.length === 0 ? (
              <p className="text-sm text-muted">{t.noPayouts}</p>
            ) : (
              <ul className="divide-y divide-border">
                {report.payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>{fmt.date(p.arrivalDate)}</span>
                    <Badge tone={p.status === "paid" ? "success" : p.status === "in_transit" ? "sage" : "outline"}>{payoutStatus[p.status]}</Badge>
                    <span className="w-24 text-right font-medium tabular-nums">{fmt.money(p.amountCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <section className="mt-6 grid gap-3">
        <h2 className="text-lg font-semibold">{t.byJob}</h2>
        <Table>
          <THead>
            <tr>
              <TH>{t.colJob}</TH>
              <TH align="right">{t.colOrders}</TH>
              <TH align="right">{t.colSales}</TH>
              <TH align="right">{t.colAov}</TH>
            </tr>
          </THead>
          <TBody>
            {report.byJob.map((j) => (
              <TR key={j.jobId}>
                <TD>
                  <Link href={`/jobs/${j.jobId}`} className="font-medium hover:underline">
                    {j.jobName}
                  </Link>
                </TD>
                <TD align="right">{fmt.number(j.orders)}</TD>
                <TD align="right">{fmt.money(j.salesCents)}</TD>
                <TD align="right">{fmt.money(j.aovCents)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </section>
    </>
  );
}
