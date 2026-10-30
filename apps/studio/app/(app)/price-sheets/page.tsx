import { Badge } from "@snapbell/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { EmptyState } from "@snapbell/ui/feedback";
import { formatters } from "@snapbell/sdk";
import { ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { load, requireRole } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { commonMsgs } from "@/messages/common";
import { priceSheetMsgs } from "@/messages/price-sheets";
import { NewPriceSheet, PriceSheetRowActions } from "./price-sheet-actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: priceSheetMsgs[await getLocale()].list.title };
}

export default async function PriceSheetsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  await requireRole(["owner", "admin"]);
  const { archived } = await searchParams;
  const [sheets, labs] = await Promise.all([load((c) => c.priceSheets.list()), load((c) => c.labs.list())]);
  const showArchived = archived === "1";
  const locale = await getLocale();
  const t = priceSheetMsgs[locale].list;
  const fmt = formatters(locale);
  const visible = sheets.filter((s) => s.archived === showArchived);

  return (
    <>
      <PageHeader title={t.title} description={t.description} actions={<NewPriceSheet labs={labs} />} />
      <div className="mb-4 flex gap-4 text-sm">
        <Link href="/price-sheets" aria-current={!showArchived ? "page" : undefined} className={!showArchived ? "font-medium" : "text-muted hover:text-ink"}>
          {t.active(sheets.filter((s) => !s.archived).length)}
        </Link>
        <Link href="/price-sheets?archived=1" aria-current={showArchived ? "page" : undefined} className={showArchived ? "font-medium" : "text-muted hover:text-ink"}>
          {t.archivedTab(sheets.filter((s) => s.archived).length)}
        </Link>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={<ReceiptText />} title={showArchived ? t.nothingArchived : t.empty} description={t.emptyBody} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>{t.colName}</TH>
              <TH>{t.colLab}</TH>
              <TH align="right">{t.colProducts}</TH>
              <TH align="right">{t.colJobs}</TH>
              <TH>{t.colUpdated}</TH>
              <TH>
                <span className="sr-only">{commonMsgs[locale].actions}</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {visible.map((s) => (
              <TR key={s.id}>
                <TD>
                  <Link href={`/price-sheets/${s.id}`} className="font-medium hover:underline">
                    {s.name}
                  </Link>
                  {s.archived && (
                    <Badge tone="outline" className="ml-2">
                      {t.archived}
                    </Badge>
                  )}
                </TD>
                <TD className="text-muted">{s.labName}</TD>
                <TD align="right">{s.productCount}</TD>
                <TD align="right">{s.jobsUsing}</TD>
                <TD className="text-muted">{fmt.date(s.updatedAt)}</TD>
                <TD align="right">
                  <PriceSheetRowActions sheet={s} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
