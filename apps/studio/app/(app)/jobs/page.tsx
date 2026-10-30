import { formatters, type JobStatus } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { EmptyState } from "@snapbell/ui/feedback";
import { Input } from "@snapbell/ui/input";
import { cn } from "@snapbell/ui/lib/cn";
import { Briefcase, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { canSeeMoney, getSession, load } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { getLabels } from "@/lib/labels";
import { commonMsgs } from "@/messages/common";
import { jobsMsgs } from "@/messages/jobs";
import { JobRowActions } from "./row-actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: jobsMsgs[await getLocale()].list.title };
}

const FILTERS: Array<JobStatus | ""> = ["", "live", "draft", "closed"];

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "", q = "" } = await searchParams;
  const { member } = await getSession();
  const valid = FILTERS.includes(status as JobStatus | "") ? (status as JobStatus | "") : "";
  const locale = await getLocale();
  const t = jobsMsgs[locale].list;
  const fmt = formatters(locale);
  const { albumTypes, jobStatus } = getLabels(locale);
  const filterLabel = (f: JobStatus | "") => (f ? jobStatus[f].label : commonMsgs[locale].all);
  const jobs = await load((c) => c.jobs.list({ status: valid || undefined, q: q || undefined }));
  const money = canSeeMoney(member.role);
  const href = (s: string) => `/jobs?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}) })}`;

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <Button asChild>
            <Link href="/jobs/new">
              <Plus /> {t.newJob}
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label={t.filterLabel} className="flex gap-1 rounded-input bg-sunken p-1">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={href(f)}
              aria-current={valid === f ? "page" : undefined}
              className={cn("rounded-[6px] px-3 py-1.5 text-sm", valid === f ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-ink")}
            >
              {filterLabel(f)}
            </Link>
          ))}
        </nav>
        <form className="relative ml-auto w-full max-w-xs" role="search">
          {valid && <input type="hidden" name="status" value={valid} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input name="q" defaultValue={q} placeholder={t.searchPlaceholder} aria-label={t.searchLabel} className="pl-9" />
        </form>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title={q || valid ? t.noMatch : t.empty}
          description={q || valid ? t.noMatchBody : t.emptyBody}
          action={
            <Button asChild>
              <Link href="/jobs/new">{t.newJob}</Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>{t.colJob}</TH>
              <TH>{t.colDate}</TH>
              <TH>{t.colAlbum}</TH>
              <TH>{t.colStatus}</TH>
              <TH align="right">{t.colSubjects}</TH>
              <TH align="right">{t.colMatched}</TH>
              {money && <TH align="right">{t.colSales}</TH>}
              <TH>
                <span className="sr-only">{commonMsgs[locale].actions}</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {jobs.map((job) => {
              const cd = job.status === "live" ? fmt.countdown(job.deadline) : null;
              return (
                <TR key={job.id}>
                  <TD>
                    <Link href={`/jobs/${job.id}`} className="grid font-medium hover:underline">
                      {job.name}
                      <span className="text-xs font-normal text-muted">{job.organizationName}</span>
                    </Link>
                  </TD>
                  <TD className="whitespace-nowrap">{fmt.date(job.date)}</TD>
                  <TD>{albumTypes[job.albumType].label}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={jobStatus[job.status].tone}>{jobStatus[job.status].label}</Badge>
                      {cd && !cd.closed && <Badge tone={cd.urgent ? "warning" : "outline"}>{cd.label}</Badge>}
                    </div>
                  </TD>
                  <TD align="right">{fmt.number(job.stats.subjects)}</TD>
                  <TD align="right">{job.stats.photos ? fmt.percent(job.stats.matchedPct / 100) : "—"}</TD>
                  {money && <TD align="right">{fmt.money(job.stats.salesCents)}</TD>}
                  <TD align="right">
                    <JobRowActions jobId={job.id} />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
