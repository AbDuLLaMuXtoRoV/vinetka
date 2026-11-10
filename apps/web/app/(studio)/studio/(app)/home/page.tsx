import { formatters } from "@snapbell/sdk";
import { Alert } from "@snapbell/ui/feedback";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@snapbell/ui/card";
import { EmptyState } from "@snapbell/ui/feedback";
import { StatCard } from "@snapbell/ui/data";
import { ArrowRight, Briefcase, CircleDollarSign, ListChecks, Plus, ShoppingBag, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@studio/components/auto-refresh";
import { PageHeader } from "@studio/components/page-header";
import { canSeeMoney, getSession, load } from "@studio/lib/api";
import { getLocale } from "@studio/lib/i18n";
import { getLabels } from "@studio/lib/labels";
import { homeMsgs } from "@studio/messages/home";
import { studioHref } from "@studio/lib/paths";

export async function generateMetadata(): Promise<Metadata> {
  return { title: homeMsgs[await getLocale()].metaTitle };
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const { member, studio } = await getSession();
  const home = await load((c) => c.studio.home());
  const money = canSeeMoney(member.role);
  const firstName = member.name.split(" ")[0] ?? member.name;
  const locale = await getLocale();
  const t = homeMsgs[locale];
  const fmt = formatters(locale);
  const { jobStatus, orderStatus } = getLabels(locale);

  return (
    <div className="grid gap-8">
      <AutoRefresh intervalMs={30_000} />
      <PageHeader
        title={t.greeting(firstName)}
        description={t.happening(studio.name)}
        actions={
          <Button asChild>
            <Link href="/studio/jobs/new">
              <Plus /> {t.newJob}
            </Link>
          </Button>
        }
      />

      {denied && <Alert tone="warning" title={t.deniedTitle}>{t.deniedBody}</Alert>}
      {studio.stripe.status !== "active" && money && (
        <Alert
          tone="warning"
          title={t.stripeTitle}
          action={
            <Button size="sm" variant="secondary" asChild>
              <Link href="/studio/settings/payments">{t.connect}</Link>
            </Button>
          }
        >
          {t.stripeBody}
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {money && <StatCard label={t.salesToday} value={fmt.money(home.salesTodayCents)} icon={<CircleDollarSign />} footer={<p className="text-xs text-muted">{t.orders(home.ordersToday)}</p>} />}
        {money && <StatCard label={t.salesWeek} value={fmt.money(home.salesWeekCents)} icon={<CircleDollarSign />} footer={<p className="text-xs text-muted">{t.orders(home.ordersWeek)}</p>} />}
        <StatCard label={t.openJobs} value={home.openJobs.length} icon={<Briefcase />} />
        <StatCard label={t.todos} value={home.todos.reduce((n, td) => n + (td.count > 0 ? 1 : 0), 0)} icon={<ListChecks />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t.openJobs}</CardTitle>
            <Link href="/studio/jobs" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
              {t.allJobs} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </CardHeader>
          <CardBody className="grid gap-3">
            {home.openJobs.length === 0 ? (
              <EmptyState icon={<Briefcase />} title={t.noOpenJobs} description={t.noOpenJobsBody} action={<Button asChild><Link href="/studio/jobs/new">{t.newJob}</Link></Button>} />
            ) : (
              home.openJobs.map((job) => {
                const cd = fmt.countdown(job.deadline);
                return (
                  <Link key={job.id} href={`/studio/jobs/${job.id}`} className="grid gap-2 rounded-input border border-border p-4 transition-colors hover:border-ink/40 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {job.organizationName} · {job.name}
                      </p>
                      <p className="text-xs text-muted">
                        {t.jobLine(job.stats.subjects, job.stats.matchedPct, job.stats.buyers)}
                        {money && <> · {fmt.money(job.stats.salesCents)}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={jobStatus[job.status].tone}>{jobStatus[job.status].label}</Badge>
                      {cd && <Badge tone={cd.closed ? "neutral" : cd.urgent ? "warning" : "outline"}>{cd.label}</Badge>}
                    </div>
                  </Link>
                );
              })
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.todos}</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-2">
            {home.todos.filter((td) => td.count > 0).length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Sparkles className="size-4" aria-hidden /> {t.caughtUp}
              </p>
            ) : (
              home.todos
                .filter((td) => td.count > 0)
                .map((td) => (
                  <Link key={`${td.kind}-${td.href}`} href={studioHref(td.href)} className="flex min-h-11 items-center justify-between gap-3 rounded-input px-3 hover:bg-ink/5">
                    <span className="text-sm">{td.label}</span>
                    <Badge tone={td.kind === "review" || td.kind === "stripe" ? "warning" : "neutral"}>{fmt.number(td.count)}</Badge>
                  </Link>
                ))
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t.recentOrders}
            <span className="inline-flex items-center gap-1.5 text-xs font-normal text-muted">
              <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden /> {t.live}
            </span>
          </CardTitle>
          <Link href="/studio/orders" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
            {t.allOrders} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </CardHeader>
        <CardBody>
          {home.recentOrders.length === 0 ? (
            <EmptyState icon={<ShoppingBag />} title={t.noOrders} description={t.noOrdersBody} />
          ) : (
            <ul className="divide-y divide-border">
              {home.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/studio/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-ink/[0.02]">
                    <span className="w-24 font-mono text-xs text-muted">{o.number}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {o.customerName} <span className="text-muted">· {o.subjectNames.join(", ")} · {o.jobName}</span>
                    </span>
                    {o.big && <Badge tone="accent">{t.bigOrder}</Badge>}
                    <Badge tone={orderStatus[o.status].tone}>{orderStatus[o.status].label}</Badge>
                    <span className="w-20 text-right text-sm font-medium tabular-nums">{fmt.money(o.totalCents)}</span>
                    <span className="w-24 text-right text-xs text-muted">{fmt.relative(o.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
