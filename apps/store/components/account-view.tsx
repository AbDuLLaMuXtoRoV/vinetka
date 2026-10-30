"use client";

import type { AccountSummary, OrderStatus, Parent } from "@snapbell/sdk";
import { Badge, type BadgeTone } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Alert, EmptyState } from "@snapbell/ui/feedback";
import { LanguageSwitcher, useFormatters, useMessages } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { RadioGroup } from "@snapbell/ui/radio-group";
import { Switch } from "@snapbell/ui/switch";
import { useToast } from "@snapbell/ui/toast";
import { ChevronRight, Download, LogOut, ReceiptText, Ticket, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { requestDataExport, requestDeletion, signOut, updateAccount } from "@/app/actions";
import { accountMsgs } from "@/messages/account";
import { statusMsgs } from "@/messages/status";

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  paid: "neutral",
  at_lab: "sage",
  shipped: "accent",
  delivered: "success",
  refunded: "warning",
  partially_refunded: "warning",
};

/** Screen 11: children, orders, notifications, and GDPR/COPPA data export and deletion. */
export function AccountView({ account }: { account: AccountSummary }) {
  const toast = useToast();
  const t = useMessages(accountMsgs);
  const status = useMessages(statusMsgs);
  const fmt = useFormatters();
  const [parent, setParent] = useState<Parent>(account.parent);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletion, setDeletion] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const children = useMemo(() => {
    const map = new Map<string, AccountSummary["children"]>();
    for (const c of account.children) {
      const key = `${c.studioName} · ${c.year}`;
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return [...map.entries()];
  }, [account.children]);

  const save = (patch: Parameters<typeof updateAccount>[0], optimistic: Parent) => {
    const previous = parent;
    setParent(optimistic);
    start(async () => {
      const res = await updateAccount(patch);
      if (res.ok) setParent(res.data);
      else {
        setParent(previous);
        toast({ title: t.saveFailed, description: res.message, tone: "danger" });
      }
    });
  };

  const setNotification = (key: "orderUpdates" | "galleryReady" | "deadlineReminders", value: boolean) => {
    const notifications = { ...parent.notifications, [key]: value };
    save({ notifications }, { ...parent, notifications });
  };

  const setConsent = (key: "smsUpdates" | "marketing", value: boolean) => {
    save({ consent: { [key]: value } }, { ...parent, consent: { ...parent.consent, [key]: value } });
  };

  return (
    <div className="grid gap-10">
      <header className="grid gap-1">
        <h1 className="text-xl font-semibold md:text-2xl">{parent.name ? t.hi(parent.name.split(" ")[0]!) : t.myAccount}</h1>
        <p className="text-sm text-muted">{[parent.phone, parent.email].filter(Boolean).join(" · ")}</p>
      </header>

      <section aria-labelledby="kids-h" className="grid gap-3">
        <h2 id="kids-h" className="text-base font-semibold">
          {t.children}
        </h2>
        {children.length === 0 ? (
          <EmptyState title={t.noAlbums} description={t.noAlbumsBody} action={<Button asChild><Link href="/">{t.enterCode}</Link></Button>} />
        ) : (
          children.map(([group, kids]) => (
            <div key={group} className="grid gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{group}</p>
              <ul className="divide-y divide-border rounded-card border border-border bg-surface">
                {kids.map((k) => (
                  <li key={k.subjectId}>
                    <Link href={`/a/${k.albumCode}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-ink/[0.02]">
                      <span>
                        <span className="block font-medium">{k.name}</span>
                        <span className="text-xs text-muted">{k.jobName}</span>
                      </span>
                      <ChevronRight className="size-5 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section aria-labelledby="orders-h" className="grid gap-3">
        <h2 id="orders-h" className="text-base font-semibold">
          {t.orders}
        </h2>
        {account.orders.length === 0 ? (
          <p className="text-sm text-muted">{t.noOrders}</p>
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {account.orders.map((o) => {
              const s = { label: status[o.status] ?? o.status, tone: STATUS_TONE[o.status] ?? ("neutral" as const) };
              return (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-ink/[0.02]">
                    <ReceiptText className="size-5 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {o.number} · {o.subjectNames.join(", ")}
                      </span>
                      <span className="text-xs text-muted">
                        {fmt.date(o.createdAt)} · {t.items(o.itemCount)}
                      </span>
                    </span>
                    <span className="grid justify-items-end gap-1">
                      <span className="text-sm tabular-nums">{fmt.money(o.totalCents)}</span>
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {account.passes.length > 0 && (
        <section aria-labelledby="passes-h" className="grid gap-3">
          <h2 id="passes-h" className="text-base font-semibold">
            {t.passes}
          </h2>
          <ul className="grid gap-2">
            {account.passes.map((p) => {
              const [before, remaining, after] = t.passLeft(fmt.money(p.remainingCents), fmt.money(p.creditCents));
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-4">
                  <Ticket className="size-5 text-sage" aria-hidden />
                  <span className="flex-1 text-sm">
                    {before}
                    <strong className="tabular-nums">{remaining}</strong>
                    {after}
                  </span>
                  <span className="text-xs text-muted">{t.bought(fmt.date(p.createdAt))}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="notif-h" className="grid gap-4 rounded-card border border-border bg-surface p-5">
        <h2 id="notif-h" className="text-base font-semibold">
          {t.notifications}
        </h2>
        <Switch id="n-gallery" checked={parent.notifications.galleryReady} onCheckedChange={(v) => setNotification("galleryReady", v)} label={t.galleryReady} description={t.galleryReadyNote} />
        <Switch id="n-deadline" checked={parent.notifications.deadlineReminders} onCheckedChange={(v) => setNotification("deadlineReminders", v)} label={t.deadlineReminders} />
        <Switch id="n-orders" checked={parent.notifications.orderUpdates} onCheckedChange={(v) => setNotification("orderUpdates", v)} label={t.orderUpdates} />
        <div className="grid gap-2">
          <p className="text-sm font-medium">{t.sendBy}</p>
          <RadioGroup
            name="channel"
            aria-label={t.channelLabel}
            value={parent.notifications.channel}
            onValueChange={(v) => {
              const notifications = { ...parent.notifications, channel: v as "sms" | "email" };
              save({ notifications }, { ...parent, notifications });
            }}
            options={[
              { value: "sms", label: t.textMessage, disabled: !parent.phone },
              { value: "email", label: t.email, disabled: !parent.email },
            ]}
          />
        </div>
        <hr className="border-border" />
        <Switch id="c-sms" checked={parent.consent.smsUpdates} onCheckedChange={(v) => setConsent("smsUpdates", v)} label={t.smsUpdates} description={t.smsUpdatesNote} />
        <Switch id="c-marketing" checked={parent.consent.marketing} onCheckedChange={(v) => setConsent("marketing", v)} label={t.marketing} />
        {pending && <p className="text-xs text-muted" role="status">{t.saving}</p>}
      </section>

      <section aria-labelledby="lang-h" className="grid gap-3 rounded-card border border-border bg-surface p-5">
        <div>
          <h2 id="lang-h" className="text-base font-semibold">
            {t.language}
          </h2>
          <p className="text-sm text-muted">{t.languageNote}</p>
        </div>
        <LanguageSwitcher className="w-fit" />
      </section>

      <section aria-labelledby="data-h" className="grid gap-4 rounded-card border border-border bg-surface p-5">
        <div>
          <h2 id="data-h" className="text-base font-semibold">
            {t.data}
          </h2>
          <p className="text-sm text-muted">{t.dataNote}</p>
        </div>
        {deletion && (
          <Alert tone="success" title={t.deletionRequested}>
            {t.deletionBody(fmt.date(deletion))}
          </Alert>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() =>
              start(async () => {
                const res = await requestDataExport();
                toast(res.ok ? { title: t.exportRequested, description: t.exportBody(res.data.deliverTo), tone: "success" } : { title: t.exportFailed, description: res.message, tone: "danger" });
              })
            }
          >
            <Download aria-hidden /> {t.download}
          </Button>
          <Button variant="ghost" className="text-danger" onClick={() => setDeleteOpen(true)} disabled={!!deletion}>
            <Trash2 aria-hidden /> {t.delete}
          </Button>
        </div>
      </section>

      <form action={signOut}>
        <Button type="submit" variant="ghost">
          <LogOut aria-hidden /> {t.signOut}
        </Button>
      </form>

      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t.deleteTitle}
        description={t.deleteDescription}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t.keep}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await requestDeletion();
                  if (res.ok) {
                    setDeletion(res.data.completesBy);
                    setDeleteOpen(false);
                  } else toast({ title: t.deletionFailed, description: res.message, tone: "danger" });
                })
              }
            >
              {t.deleteEverything}
            </Button>
          </>
        }
      >
        <ul className="grid list-disc gap-1 pl-5 text-sm text-muted">
          {t.deleteList.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
