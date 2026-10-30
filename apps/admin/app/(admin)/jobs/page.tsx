import { formatters, type JobStatus } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import type { Metadata } from "next";
import { FilterSelect, SearchBar } from "@/components/search-bar";
import { AdminHeader } from "@/components/shell";
import { load } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { getLabels } from "@/lib/labels";
import { adminMsgs } from "@/messages/admin";

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminMsgs[await getLocale()].jobs.title };
}

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "" } = await searchParams;
  const locale = await getLocale();
  const t = adminMsgs[locale].jobs;
  const fmt = formatters(locale);
  const { jobStatus } = getLabels(locale);
  const valid = status in jobStatus ? (status as JobStatus) : undefined;
  const jobs = await load((c) => c.admin.jobs({ q: q || undefined, status: valid }));
  return (
    <>
      <AdminHeader title={t.title} description={t.description} />
      <SearchBar q={q} placeholder={t.placeholder} locale={locale}>
        <FilterSelect name="status" value={valid ?? ""} label={t.colStatus} locale={locale} options={Object.entries(jobStatus).map(([k, v]) => [k, v.label])} />
      </SearchBar>
      <Table>
        <THead>
          <tr>
            <TH>{t.colJob}</TH>
            <TH>{t.colStudio}</TH>
            <TH>{t.colDate}</TH>
            <TH>{t.colStatus}</TH>
            <TH align="right">{t.colSubjects}</TH>
            <TH align="right">{t.colMatched}</TH>
            <TH align="right">{t.colReview}</TH>
            <TH align="right">{t.colSales}</TH>
          </tr>
        </THead>
        <TBody>
          {jobs.map((j) => (
            <TR key={j.id}>
              <TD>
                <span className="font-medium">{j.name}</span>
                <span className="block text-xs text-muted">
                  {j.organizationName} · <span className="font-mono">{j.id}</span>
                </span>
              </TD>
              <TD>{j.studioName}</TD>
              <TD className="text-muted">{fmt.date(j.date)}</TD>
              <TD>
                <Badge tone={jobStatus[j.status].tone}>{jobStatus[j.status].label}</Badge>
              </TD>
              <TD align="right">{fmt.number(j.stats.subjects)}</TD>
              <TD align="right">{j.stats.photos ? fmt.percent(j.stats.matchedPct / 100) : "—"}</TD>
              <TD align="right">{j.stats.reviewMatches ? <Badge tone="warning">{j.stats.reviewMatches}</Badge> : "0"}</TD>
              <TD align="right">{fmt.money(j.stats.salesCents)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {jobs.length === 0 && <p className="mt-4 text-sm text-muted">{t.empty}</p>}
    </>
  );
}
