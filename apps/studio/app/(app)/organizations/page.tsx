import { formatters } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { EmptyState } from "@snapbell/ui/feedback";
import { Building2, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { OrganizationDialog } from "@/components/org-form";
import { getLabels } from "@/lib/labels";
import { getLocale } from "@/lib/i18n";
import { orgMsgs } from "@/messages/organizations";
import { PageHeader } from "@/components/page-header";
import { canSeeMoney, getSession, load } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  return { title: orgMsgs[await getLocale()].title };
}

export default async function OrganizationsPage() {
  const { member } = await getSession();
  const orgs = await load((c) => c.organizations.list());
  const money = canSeeMoney(member.role);
  const locale = await getLocale();
  const t = orgMsgs[locale];
  const fmt = formatters(locale);
  const { orgTypes } = getLabels(locale);
  return (
    <>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <OrganizationDialog
            trigger={
              <Button>
                <Plus /> {t.newOrg}
              </Button>
            }
          />
        }
      />
      {orgs.length === 0 ? (
        <EmptyState icon={<Building2 />} title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>{t.colName}</TH>
              <TH>{t.colType}</TH>
              <TH>{t.colContact}</TH>
              <TH align="right">{t.colJobs}</TH>
              {money && <TH align="right">{t.colLifetime}</TH>}
            </tr>
          </THead>
          <TBody>
            {orgs.map((o) => (
              <TR key={o.id}>
                <TD>
                  <Link href={`/organizations/${o.id}`} className="font-medium hover:underline">
                    {o.name}
                  </Link>
                </TD>
                <TD className="text-muted">{orgTypes[o.type]}</TD>
                <TD>
                  {o.contactName}
                  <span className="block text-xs text-muted">{o.contactEmail}</span>
                </TD>
                <TD align="right">{o.jobCount}</TD>
                {money && <TD align="right">{fmt.money(o.lifetimeSalesCents)}</TD>}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
