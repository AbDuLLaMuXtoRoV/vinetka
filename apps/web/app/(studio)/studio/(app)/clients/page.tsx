import { formatPhoneDisplay, formatters } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { Alert, EmptyState } from "@snapbell/ui/feedback";
import { Input } from "@snapbell/ui/input";
import { Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@studio/components/page-header";
import { load, requireRole } from "@studio/lib/api";
import { getLocale } from "@studio/lib/i18n";
import { clientsMsgs } from "@studio/messages/clients";

export async function generateMetadata(): Promise<Metadata> {
  return { title: clientsMsgs[await getLocale()].title };
}

/** Parents who have bought from this studio. Owners and admins only: it shows contacts and spend. */
export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["owner", "admin"]);
  const { q = "" } = await searchParams;
  const clients = await load((c) => c.studio.clients({ q: q || undefined }));
  const locale = await getLocale();
  const t = clientsMsgs[locale];
  const fmt = formatters(locale);

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <div className="mb-4 grid gap-3">
        <Alert tone="info">{t.note}</Alert>
        <form className="flex flex-wrap gap-2" role="search">
          <div className="relative min-w-60 flex-1 md:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input name="q" defaultValue={q} placeholder={t.searchPlaceholder} aria-label={t.searchLabel} className="pl-9" />
          </div>
          <button type="submit" className="h-11 rounded-input bg-ink px-4 text-sm font-medium text-bg">
            {t.search}
          </button>
        </form>
      </div>

      {clients.length === 0 ? (
        <EmptyState icon={<Users />} title={t.emptyTitle} description={q ? t.emptyFiltered : t.emptyBody} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>{t.colName}</TH>
              <TH>{t.colContact}</TH>
              <TH>{t.colChildren}</TH>
              <TH align="right">{t.colOrders}</TH>
              <TH align="right">{t.colSpent}</TH>
              <TH>{t.colLast}</TH>
            </tr>
          </THead>
          <TBody>
            {clients.map((client) => {
              // The orders search matches email, phone or name; prefer the most specific.
              const ordersHref = `/studio/orders?${new URLSearchParams({ q: client.email ?? client.phone ?? client.name ?? "" })}`;
              return (
                <TR key={client.id}>
                  <TD>
                    <div className="grid gap-1">
                      <Link href={ordersHref} className="font-medium hover:underline">
                        {client.name ?? t.noName}
                      </Link>
                      {client.marketingOptIn && (
                        <Badge tone="success" className="w-fit">
                          {t.offers}
                        </Badge>
                      )}
                    </div>
                  </TD>
                  <TD>
                    <div className="grid gap-0.5 text-sm">
                      {client.phone && (
                        <a href={`tel:${client.phone}`} className="whitespace-nowrap hover:underline">
                          {formatPhoneDisplay(client.phone)}
                        </a>
                      )}
                      {client.email && (
                        <a href={`mailto:${client.email}`} className="text-muted hover:underline">
                          {client.email}
                        </a>
                      )}
                    </div>
                  </TD>
                  <TD className="text-muted">{client.children.join(", ")}</TD>
                  <TD align="right">
                    <Link href={ordersHref} className="hover:underline" aria-label={`${t.viewOrders}: ${client.name ?? t.noName}`}>
                      {fmt.number(client.orders)}
                    </Link>
                  </TD>
                  <TD align="right">{fmt.money(client.spentCents)}</TD>
                  <TD className="whitespace-nowrap text-muted">{fmt.date(client.lastOrderAt)}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
      <p className="mt-3 text-xs text-muted">{t.count(clients.length)}</p>
    </>
  );
}
