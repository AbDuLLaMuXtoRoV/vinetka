import { formatters } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { getJob } from "@/lib/queries";
import { getLocale } from "@/lib/i18n";
import { getLabels } from "@/lib/labels";
import { jobsMsgs } from "@/messages/jobs";
import { JobTabs } from "./job-tabs";

export default async function JobLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  const locale = await getLocale();
  const t = jobsMsgs[locale].header;
  const fmt = formatters(locale);
  const { albumTypes, jobStatus, markets: marketLabels } = getLabels(locale);
  return (
    <>
      <PageHeader
        back={{ href: "/jobs", label: t.back }}
        title={`${job.organizationName} · ${job.name}`}
        meta={
          <>
            <Badge tone={jobStatus[job.status].tone}>{jobStatus[job.status].label}</Badge>
            <Badge tone="outline">{t.album(albumTypes[job.albumType].label)}</Badge>
            <span className="text-sm text-muted">
              {marketLabels[job.market]} · {t.pictureDay(fmt.date(job.date))}
              {job.sharedAccessCode && (
                <>
                  {" "}
                  · {t.code} <span className="font-mono font-medium text-ink">{job.sharedAccessCode}</span>
                </>
              )}
            </span>
          </>
        }
      />
      <JobTabs jobId={job.id} reviewCount={job.stats.reviewMatches} />
      <div className="mt-6">{children}</div>
    </>
  );
}
