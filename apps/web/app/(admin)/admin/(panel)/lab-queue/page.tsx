import { formatters, type LabSubmission } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { StatCard, Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { cn } from "@snapbell/ui/lib/cn";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@admin/components/shell";
import { load } from "@admin/lib/api";
import { getLocale } from "@admin/lib/i18n";
import { getLabels } from "@admin/lib/labels";
import { adminMsgs } from "@admin/messages/admin";
import { RetryButton } from "./retry-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminMsgs[await getLocale()].nav.labQueue };
}

export default async function LabQueuePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "" } = await searchParams;
  const locale = await getLocale();
  const t = adminMsgs[locale].lab;
  const fmt = formatters(locale);
  const { labStatus } = getLabels(locale);
  const valid = status in labStatus ? (status as LabSubmission["status"]) : undefined;
  const [rows, all] = await Promise.all([load((c) => c.admin.labQueue({ status: valid })), valid ? load((c) => c.admin.labQueue()) : null]);
  const everything = all ?? rows;
  const count = (s: LabSubmission["status"]) => everything.filter((r) => r.status === s).length;

  return (
    <>
      <AdminHeader title={t.title} description={t.description} />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard label={t.failed} value={count("failed")} className={count("failed") ? "border-danger/40" : undefined} />
        <StatCard label={t.queued} value={count("queued")} />
        <StatCard label={t.inProduction} value={count("submitted") + count("accepted")} />
        <StatCard label={t.shipped} value={count("shipped")} />
      </div>
      <nav aria-label={t.filter} className="mb-4 flex flex-wrap gap-1">
        {["", "failed", "queued", "submitted", "accepted", "shipped"].map((s) => (
          <Link
            key={s}
            href={s ? `/admin/lab-queue?status=${s}` : "/admin/lab-queue"}
            aria-current={(valid ?? "") === s ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1.5 text-sm", (valid ?? "") === s ? "border-ink bg-ink text-bg" : "border-border text-muted hover:text-ink")}
          >
            {s ? labStatus[s as LabSubmission["status"]].label : t.all}
          </Link>
        ))}
      </nav>
      <Table>
        <THead>
          <tr>
            <TH>{t.colOrder}</TH>
            <TH>{t.colStudio}</TH>
            <TH>{t.colLab}</TH>
            <TH>{t.colStatus}</TH>
            <TH align="right">{t.colAttempts}</TH>
            <TH>{t.colError}</TH>
            <TH>{t.colUpdated}</TH>
            <TH>
              <span className="sr-only">{t.actions}</span>
            </TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.id} className={r.status === "failed" ? "bg-danger/5" : undefined}>
              <TD>
                <Link href={`/admin/orders/${r.orderId}`} className="font-mono text-sm font-medium hover:underline">
                  {r.orderNumber}
                </Link>
              </TD>
              <TD>{r.studioName}</TD>
              <TD className="text-muted">{r.labName}</TD>
              <TD>
                <Badge tone={labStatus[r.status].tone}>{labStatus[r.status].label}</Badge>
              </TD>
              <TD align="right">{r.attempts}</TD>
              <TD className="max-w-80 text-xs text-danger">{r.lastError ?? ""}</TD>
              <TD className="whitespace-nowrap text-muted">{fmt.relative(r.updatedAt)}</TD>
              <TD align="right">{r.status === "failed" && <RetryButton id={r.id} />}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {rows.length === 0 && <p className="mt-4 text-sm text-muted">{t.empty}</p>}
    </>
  );
}
