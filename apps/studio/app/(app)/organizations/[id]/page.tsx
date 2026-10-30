import { formatters } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@snapbell/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { Mail, Pencil, Phone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyField } from "@/components/copy-field";
import { OrganizationDialog } from "@/components/org-form";
import { PageHeader } from "@/components/page-header";
import { canSeeMoney, getSession, load } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { getLabels } from "@/lib/labels";
import { orgMsgs } from "@/messages/organizations";

export async function generateMetadata(): Promise<Metadata> {
  return { title: orgMsgs[await getLocale()].detail.metaTitle };
}

export default async function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member } = await getSession();
  const org = await load((c) => c.organizations.get(id));
  const money = canSeeMoney(member.role);
  const { jobs, resultsLink, ...base } = org;
  const locale = await getLocale();
  const t = orgMsgs[locale].detail;
  const fmt = formatters(locale);
  const { albumTypes, jobStatus, orgTypes } = getLabels(locale);

  return (
    <>
      <PageHeader
        back={{ href: "/organizations", label: t.back }}
        title={org.name}
        meta={<Badge tone="outline">{orgTypes[org.type]}</Badge>}
        actions={
          <>
            <OrganizationDialog
              organization={base}
              trigger={
                <Button variant="outline">
                  <Pencil /> {t.edit}
                </Button>
              }
            />
            <Button asChild>
              <Link href={`/jobs/new?organizationId=${org.id}`}>
                <Plus /> {t.newJob}
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.contact}</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-2 text-sm">
              <p className="font-medium">{org.contactName}</p>
              <a href={`mailto:${org.contactEmail}`} className="inline-flex items-center gap-2 text-muted hover:text-ink">
                <Mail className="size-4" aria-hidden /> {org.contactEmail}
              </a>
              {org.contactPhone && (
                <p className="inline-flex items-center gap-2 text-muted">
                  <Phone className="size-4" aria-hidden /> {org.contactPhone}
                </p>
              )}
              {money && (
                <p className="mt-3 border-t border-border pt-3">
                  {t.lifetime} <span className="font-semibold tabular-nums">{fmt.money(org.lifetimeSalesCents)}</span>
                </p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t.resultsTitle}</CardTitle>
                <p className="mt-1 text-sm text-muted">{t.resultsBody}</p>
              </div>
            </CardHeader>
            <CardBody>
              <CopyField value={resultsLink} label={t.resultsLabel} />
            </CardBody>
          </Card>
        </div>

        <section className="grid content-start gap-3">
          <h2 className="text-lg font-semibold">{t.jobs}</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted">{t.noJobs(org.name)}</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>{t.colJob}</TH>
                  <TH>{t.colDate}</TH>
                  <TH>{t.colAlbum}</TH>
                  <TH>{t.colStatus}</TH>
                  <TH align="right">{t.colBuyers}</TH>
                  {money && <TH align="right">{t.colSales}</TH>}
                </tr>
              </THead>
              <TBody>
                {jobs.map((j) => (
                  <TR key={j.id}>
                    <TD>
                      <Link href={`/jobs/${j.id}`} className="font-medium hover:underline">
                        {j.name}
                      </Link>
                    </TD>
                    <TD className="text-muted">{fmt.date(j.date)}</TD>
                    <TD>{albumTypes[j.albumType].label}</TD>
                    <TD>
                      <Badge tone={jobStatus[j.status].tone}>{jobStatus[j.status].label}</Badge>
                    </TD>
                    <TD align="right">
                      {j.stats.buyers} / {j.stats.subjects}
                    </TD>
                    {money && <TD align="right">{fmt.money(j.stats.salesCents)}</TD>}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
