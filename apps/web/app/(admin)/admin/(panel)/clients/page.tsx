import { LOCALE_LABELS, formatPhoneDisplay, formatters } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { StatCard, Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { EmptyState } from "@snapbell/ui/feedback";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import { SearchBar } from "@admin/components/search-bar";
import { AdminHeader } from "@admin/components/shell";
import { load } from "@admin/lib/api";
import { getLocale } from "@admin/lib/i18n";
import { clientsMsgs } from "@admin/messages/clients";

export async function generateMetadata(): Promise<Metadata> {
  return { title: clientsMsgs[await getLocale()].title };
}

const WEEK_MS = 7 * 86_400_000;

/** Every customer account on the platform, whichever studio they bought from (or none yet). */
export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = await load((c) => c.admin.clients({ q: q || undefined }));
  const locale = await getLocale();
  const t = clientsMsgs[locale];
  const fmt = formatters(locale);
  const weekAgo = Date.now() - WEEK_MS;

  return (
    <>
      <AdminHeader title={t.title} description={t.description} />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label={t.statTotal} value={fmt.number(rows.length)} />
        <StatCard label={t.statBuyers} value={fmt.number(rows.filter((r) => r.orders > 0).length)} />
        <StatCard label={t.statNew} value={fmt.number(rows.filter((r) => new Date(r.parent.createdAt).getTime() >= weekAgo).length)} />
      </div>
      <SearchBar q={q} placeholder={t.placeholder} locale={locale} />
      {rows.length === 0 ? (
        <EmptyState icon={<Users />} title={t.emptyTitle} description={q ? t.emptyFiltered : t.emptyBody} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>{t.colClient}</TH>
              <TH>{t.colContact}</TH>
              <TH>{t.colSignedUp}</TH>
              <TH align="right">{t.colOrders}</TH>
              <TH align="right">{t.colSpent}</TH>
              <TH>{t.colStudios}</TH>
              <TH align="right">{t.colChildren}</TH>
              <TH>{t.colLast}</TH>
              <TH>{t.colConsent}</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map(({ parent, orders, spentCents, studios, children, lastOrderAt }) => (
              <TR key={parent.id}>
                <TD>
                  <span className="font-medium">{parent.name ?? t.noName}</span>
                  <span className="block text-xs text-muted">{LOCALE_LABELS[parent.locale].native}</span>
                </TD>
                <TD>
                  <div className="grid gap-0.5 text-sm">
                    {parent.phone && (
                      <a href={`tel:${parent.phone}`} className="whitespace-nowrap hover:underline">
                        {formatPhoneDisplay(parent.phone)}
                      </a>
                    )}
                    {parent.email && (
                      <a href={`mailto:${parent.email}`} className="text-muted hover:underline">
                        {parent.email}
                      </a>
                    )}
                  </div>
                </TD>
                <TD className="whitespace-nowrap text-muted">{fmt.date(parent.createdAt)}</TD>
                <TD align="right">{fmt.number(orders)}</TD>
                <TD align="right">{fmt.money(spentCents)}</TD>
                <TD className="text-muted">{studios.map((s) => s.name).join(", ") || "—"}</TD>
                <TD align="right">{fmt.number(children)}</TD>
                <TD className="whitespace-nowrap text-muted">{lastOrderAt ? fmt.date(lastOrderAt) : "—"}</TD>
                <TD>
                  <span className="flex flex-wrap gap-1">
                    {parent.consent.smsUpdates && <Badge tone="neutral">{t.consentTexts}</Badge>}
                    {parent.consent.marketing && <Badge tone="success">{t.consentOffers}</Badge>}
                    {!parent.consent.smsUpdates && !parent.consent.marketing && <span className="text-xs text-muted">{t.noConsent}</span>}
                  </span>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="mt-3 text-xs text-muted">{t.count(rows.length)}</p>
    </>
  );
}
