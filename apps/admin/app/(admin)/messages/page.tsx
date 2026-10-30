import { formatters, type MessageChannel, type MessageLog } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterSelect, SearchBar } from "@/components/search-bar";
import { AdminHeader } from "@/components/shell";
import { load } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { getLabels } from "@/lib/labels";
import { adminMsgs } from "@/messages/admin";

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminMsgs[await getLocale()].messages.title };
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ q?: string; channel?: string; status?: string }> }) {
  const { q = "", channel = "", status = "" } = await searchParams;
  const locale = await getLocale();
  const t = adminMsgs[locale].messages;
  const fmt = formatters(locale);
  const { messageStatus, channel: channelLabels } = getLabels(locale);
  const ch = channel === "sms" || channel === "email" ? (channel as MessageChannel) : undefined;
  const st = status in messageStatus ? (status as MessageLog["status"]) : undefined;
  const messages = await load((c) => c.admin.messages({ q: q || undefined, channel: ch, status: st }));
  return (
    <>
      <AdminHeader title={t.title} description={t.description} />
      <SearchBar q={q} placeholder={t.placeholder} locale={locale}>
        <FilterSelect name="channel" value={ch ?? ""} label={t.channel} locale={locale} options={[["sms", channelLabels.sms], ["email", channelLabels.email]]} />
        <FilterSelect name="status" value={st ?? ""} label={t.colStatus} locale={locale} options={Object.entries(messageStatus).map(([k, v]) => [k, v.label])} />
      </SearchBar>
      <Table>
        <THead>
          <tr>
            <TH>{t.colSent}</TH>
            <TH>{t.colChannel}</TH>
            <TH>{t.colTo}</TH>
            <TH>{t.colTemplate}</TH>
            <TH>{t.colMessage}</TH>
            <TH>{t.colStatus}</TH>
          </tr>
        </THead>
        <TBody>
          {messages.map((m) => (
            <TR key={m.id}>
              <TD className="whitespace-nowrap text-muted">{fmt.dateTime(m.createdAt)}</TD>
              <TD>{channelLabels[m.channel]}</TD>
              <TD className="font-mono text-xs">{m.to}</TD>
              <TD className="font-mono text-xs">{m.template}</TD>
              <TD className="max-w-md text-sm">
                <span className="line-clamp-2">{m.body}</span>
                {m.orderId && (
                  <Link href={`/orders/${m.orderId}`} className="text-xs text-muted underline">
                    {t.order}
                  </Link>
                )}
              </TD>
              <TD>
                <Badge tone={messageStatus[m.status].tone}>{messageStatus[m.status].label}</Badge>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {messages.length === 0 && <p className="mt-4 text-sm text-muted">{t.empty}</p>}
    </>
  );
}
