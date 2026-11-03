import { formatters, type Album } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Clock, Ticket } from "lucide-react";
import { dayInSentence } from "@shop/lib/dates";
import { getLocale } from "@shop/lib/i18n";
import { serverMsgs } from "@shop/messages/server";

export async function AlbumHeader({ album }: { album: Album }) {
  const locale = await getLocale();
  const t = serverMsgs[locale].album;
  const fmt = formatters(locale);
  const cd = fmt.countdown(album.job.deadline);
  const title = album.subject ? `${album.subject.firstName} ${album.subject.lastName}` : album.job.name;
  const subtitle = album.subject
    ? `${album.job.organizationName} · ${album.subject.group}`
    : `${album.job.organizationName} · ${fmt.date(album.job.date, { month: "long", day: "numeric", year: "numeric" })}`;
  const credit = album.passCreditCents > 0 ? t.passCredit(fmt.money(album.passCreditCents)) : null;

  return (
    <header className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h1 className="truncate text-xl font-semibold md:text-2xl">{title}</h1>
          <p className="text-sm text-muted">
            {subtitle}
            {album.subject && <> · {album.job.name}</>}
          </p>
        </div>
        {cd && (
          <Badge tone={cd.closed ? "neutral" : cd.urgent ? "warning" : "sage"} className="px-3 py-1 text-sm">
            <Clock aria-hidden />
            {cd.closed ? cd.label : t.badge(cd.label)}
          </Badge>
        )}
      </div>
      {cd && !cd.closed && album.job.deadline && (
        <p className="text-xs text-muted">{t.orderBy(dayInSentence(fmt, album.job.deadline), album.job.shipping.schoolPickup)}</p>
      )}
      {credit && (
        <p className="flex items-center gap-2 rounded-input bg-sage/15 px-3 py-2 text-sm">
          <Ticket className="size-4 shrink-0 text-sage" aria-hidden />
          <span>
            {credit[0]}
            <strong>{credit[1]}</strong>
            {credit[2]}
          </span>
        </p>
      )}
    </header>
  );
}
