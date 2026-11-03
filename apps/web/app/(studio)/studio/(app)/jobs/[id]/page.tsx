import { formatters, type Album } from "@snapbell/sdk";
import { Card, CardBody, CardHeader, CardTitle } from "@snapbell/ui/card";
import { StatCard } from "@snapbell/ui/data";
import { CircleCheck, CircleDashed, ExternalLink } from "lucide-react";
import Link from "next/link";
import { api, canSeeMoney, getSession } from "@studio/lib/api";
import { getJob } from "@studio/lib/queries";
import { env } from "@studio/lib/env";
import { getLocale } from "@studio/lib/i18n";
import { jobsMsgs } from "@studio/messages/jobs";
import { JobActions } from "./job-actions";

export default async function JobOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member, studio } = await getSession();
  const job = await getJob(id);
  let preview: Album | null = null;
  try {
    preview = await (await api()).jobs.preview(id);
  } catch {
    preview = null;
  }
  const money = canSeeMoney(member.role);
  const locale = await getLocale();
  const t = jobsMsgs[locale].overview;
  const fmt = formatters(locale);
  const cd = fmt.countdown(job.deadline);
  const done = job.checklist.filter((c) => c.done).length;
  const storeLink = job.sharedAccessCode ? `${env.storeUrl}/a/${job.sharedAccessCode}` : null;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t.subjects} value={fmt.number(job.stats.subjects)} />
        <StatCard label={t.photos} value={fmt.number(job.stats.photos)} />
        <StatCard label={t.matched} value={fmt.percent(job.stats.matchedPct / 100)} footer={job.stats.reviewMatches > 0 ? <Link href={`/studio/jobs/${id}/matching`} className="text-xs text-warning-ink underline">{t.toReview(job.stats.reviewMatches)}</Link> : undefined} />
        <StatCard label={t.viewers} value={fmt.number(job.stats.viewers)} />
        <StatCard label={t.buyers} value={fmt.number(job.stats.buyers)} footer={job.stats.viewers > 0 ? <p className="text-xs text-muted">{t.ofViewers(fmt.percent(job.stats.buyers / job.stats.viewers))}</p> : undefined} />
        {money ? <StatCard label={t.sales} value={fmt.money(job.stats.salesCents)} footer={<p className="text-xs text-muted">{t.ordersCount(job.stats.orders)}</p>} /> : <StatCard label={t.orders} value={fmt.number(job.stats.orders)} />}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{job.status === "draft" ? t.checklist : t.status}</CardTitle>
              <p className="mt-1 text-sm text-muted">
                {job.status === "draft"
                  ? t.doneOf(done, job.checklist.length)
                  : job.status === "live"
                    ? cd && !cd.closed
                      ? t.liveUntil(fmt.date(job.deadline!), cd.label)
                      : t.liveNoDeadline
                    : job.expiresAt
                      ? t.closedUntil(fmt.date(job.expiresAt))
                      : t.closed}
              </p>
            </div>
          </CardHeader>
          <CardBody className="grid gap-5">
            <ul className="grid gap-1">
              {job.checklist.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="flex min-h-11 items-center gap-3 rounded-input px-2 hover:bg-ink/5">
                    {item.done ? <CircleCheck className="size-5 text-success" aria-label={t.done} /> : <CircleDashed className="size-5 text-muted" aria-label={t.notDone} />}
                    <span className={item.done ? "text-sm text-muted line-through" : "text-sm"}>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <JobActions job={job} stripeActive={studio.stripe.status === "active"} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.whatParentsSee}</CardTitle>
            {storeLink && job.status === "live" && (
              <a href={storeLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                {t.openAlbum} <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
          </CardHeader>
          <CardBody>
            {preview && preview.photos.length > 0 ? (
              <div className="grid gap-3">
                <p className="text-sm">
                  <span className="font-medium">{preview.subject ? `${preview.subject.firstName} ${preview.subject.lastName}` : preview.job.organizationName}</span>
                  <span className="text-muted"> · {t.photosWatermarked(preview.photos.length)}</span>
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {preview.photos.slice(0, 8).map((p) => (
                    <img key={p.id} src={p.thumbUrl} alt="" className="no-save aspect-[4/5] w-full rounded-[6px] object-cover" draggable={false} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">{t.previewEmpty}</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
