"use client";

import type { MatchQueue, MatchWithPhoto, Photo, Subject } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@snapbell/ui/disclosure";
import { Alert, EmptyState } from "@snapbell/ui/feedback";
import { cn } from "@snapbell/ui/lib/cn";
import { useFormatters, useMessages } from "@snapbell/ui/locale";
import { Modal } from "@snapbell/ui/overlay";
import { Select } from "@snapbell/ui/select";
import { Check, CheckCheck, ScanFace, Split, X } from "lucide-react";
import { useState } from "react";
import { useAction } from "@/components/use-action";
import { acceptMatch, assignPhoto, bulkAcceptMatches, reassignMatch, rejectMatch, splitMatches } from "@/lib/actions";
import { matchingMsgs } from "@/messages/matching";

const name = (s: Pick<Subject, "firstName" | "lastName">) => `${s.firstName} ${s.lastName}`;

function SubjectSelect({ subjects, value, onChange, id, exclude }: { subjects: Subject[]; value: string; onChange: (id: string) => void; id: string; exclude?: string }) {
  const t = useMessages(matchingMsgs);
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-label={t.chooseSubject}>
      <option value="">{t.chooseSubjectOption}</option>
      {subjects
        .filter((s) => s.id !== exclude)
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
        .map((s) => (
          <option key={s.id} value={s.id}>
            {s.lastName}, {s.firstName} · {s.group}
          </option>
        ))}
    </Select>
  );
}

function Thumb({ photo, confidence, selected, onToggle }: { photo: Photo; confidence?: number; selected?: boolean; onToggle?: () => void }) {
  const t = useMessages(matchingMsgs);
  const fmt = useFormatters();
  const img = <img src={photo.thumbUrl} alt={photo.filename} className="size-full object-cover" draggable={false} loading="lazy" />;
  return (
    <div className={cn("relative aspect-[4/5] overflow-hidden rounded-input bg-sunken", selected && "ring-3 ring-accent ring-offset-2 ring-offset-surface")}>
      {onToggle ? (
        <button type="button" className="block size-full" onClick={onToggle} aria-pressed={!!selected} aria-label={t.selectPhoto(photo.filename)}>
          {img}
        </button>
      ) : (
        img
      )}
      {confidence !== undefined && (
        <span className={cn("pointer-events-none absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", confidence >= 0.9 ? "bg-success text-white" : "bg-surface text-warning-ink")}>
          {fmt.percent(confidence)}
        </span>
      )}
      {selected && (
        <span className="pointer-events-none absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-accent text-accent-ink" aria-hidden>
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

export function MatchingClient({ jobId, queue, subjects }: { jobId: string; queue: MatchQueue; subjects: Subject[] }) {
  const { run, pending } = useAction();
  const t = useMessages(matchingMsgs);
  const fmt = useFormatters();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reassigning, setReassigning] = useState<MatchWithPhoto | null>(null);
  const [splitting, setSplitting] = useState<{ subject: Subject; ids: string[] } | null>(null);
  const [target, setTarget] = useState("");
  const [assign, setAssign] = useState<Record<string, string>>({});

  const review = queue.groups.filter((g) => g.review.length > 0);
  const matched = queue.groups.filter((g) => g.auto.length + g.accepted.length > 0);
  const reviewCount = review.reduce((n, g) => n + g.review.length, 0);
  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const reviewIds = review.flatMap((g) => g.review.map((m) => m.id));
  const selectedReview = reviewIds.filter((id) => selected.has(id));

  return (
    <div className="grid gap-5">
      <Alert tone="info" title={t.bannerTitle}>
        {t.bannerBody(fmt.percent(queue.autoThreshold))}
      </Alert>

      <Tabs defaultValue={reviewCount > 0 ? "review" : "matched"}>
        <TabsList variant="underline">
          <TabsTrigger value="review">
            {t.needsReview} <Badge tone={reviewCount ? "warning" : "neutral"}>{reviewCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="matched">
            {t.matched} <Badge>{matched.reduce((n, g) => n + g.auto.length + g.accepted.length, 0)}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unmatched">
            {t.unmatched} <Badge tone={queue.unmatched.length ? "outline" : "neutral"}>{queue.unmatched.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="grid gap-4">
          {review.length === 0 ? (
            <EmptyState icon={<CheckCheck />} title={t.reviewEmpty} description={t.reviewEmptyBody} />
          ) : (
            <>
              <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3 lg:top-0">
                <span className="text-sm text-muted">{selectedReview.length ? t.selected(selectedReview.length) : t.tapToSelect}</span>
                <div className="ml-auto flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(selectedReview.length === reviewIds.length ? [] : reviewIds))}>
                    {selectedReview.length === reviewIds.length ? t.clear : t.selectAll}
                  </Button>
                  <Button
                    size="sm"
                    disabled={selectedReview.length === 0}
                    loading={pending}
                    onClick={() => run(() => bulkAcceptMatches(jobId, selectedReview), { success: t.acceptedCount(selectedReview.length), onSuccess: () => setSelected(new Set()) })}
                  >
                    <CheckCheck /> {t.acceptSelected}
                  </Button>
                </div>
              </div>
              {review.map((g) => (
                <section key={g.subject.id} className="grid gap-3 rounded-card border border-border bg-surface p-4" aria-label={name(g.subject)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{name(g.subject)}</h3>
                      <p className="text-xs text-muted">
                        {g.subject.group} · {t.confirmed(g.accepted.length + g.auto.length)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => run(() => bulkAcceptMatches(jobId, g.review.map((m) => m.id)), { success: t.acceptedFor(g.subject.firstName) })}>
                      {t.acceptAll(g.review.length)}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                    {[...g.accepted, ...g.auto].slice(0, 1).map((m) => (
                      <div key={m.id} className="grid gap-1">
                        <Thumb photo={m.photo} />
                        <p className="text-center text-[11px] text-muted">{t.reference}</p>
                      </div>
                    ))}
                    {g.review.map((m) => (
                      <div key={m.id} className="grid gap-1.5">
                        <Thumb photo={m.photo} confidence={m.confidence} selected={selected.has(m.id)} onToggle={() => toggle(m.id)} />
                        <div className="flex justify-center gap-1">
                          <Button size="icon-sm" variant="ghost" aria-label={t.accept} onClick={() => run(() => acceptMatch(jobId, m.id), { success: t.accepted })}>
                            <Check />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t.reassignAria}
                            onClick={() => {
                              setTarget("");
                              setReassigning(m);
                            }}
                          >
                            <ScanFace />
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label={t.reject} onClick={() => run(() => rejectMatch(jobId, m.id), { success: t.rejected })}>
                            <X />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="matched" className="grid gap-4">
          {matched.length === 0 ? (
            <EmptyState icon={<ScanFace />} title={t.noMatches} description={t.noMatchesBody} />
          ) : (
            matched.map((g) => {
              const ms = [...g.accepted, ...g.auto];
              const picked = ms.filter((m) => selected.has(m.id)).map((m) => m.id);
              return (
                <section key={g.subject.id} className="grid gap-3 rounded-card border border-border bg-surface p-4" aria-label={name(g.subject)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{name(g.subject)}</h3>
                      <p className="text-xs text-muted">
                        {g.subject.group} · {t.photos(ms.length)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={picked.length === 0}
                      onClick={() => {
                        setTarget("");
                        setSplitting({ subject: g.subject, ids: picked });
                      }}
                    >
                      <Split /> {t.split(picked.length)}
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-6 xl:grid-cols-8">
                    {ms.map((m) => (
                      <Thumb key={m.id} photo={m.photo} confidence={m.status === "auto" ? m.confidence : undefined} selected={selected.has(m.id)} onToggle={() => toggle(m.id)} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="unmatched">
          {queue.unmatched.length === 0 ? (
            <EmptyState icon={<CheckCheck />} title={t.allMatched} />
          ) : (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {queue.unmatched.map((p) => (
                <li key={p.id} className="grid gap-2">
                  <Thumb photo={p} />
                  <SubjectSelect id={`assign-${p.id}`} subjects={subjects} value={assign[p.id] ?? ""} onChange={(v) => setAssign((a) => ({ ...a, [p.id]: v }))} />
                  <Button size="sm" variant="secondary" disabled={!assign[p.id]} onClick={() => run(() => assignPhoto(jobId, p.id, assign[p.id]!), { success: t.photoMatched })}>
                    {t.match}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Modal
        open={reassigning !== null}
        onOpenChange={(o) => !o && setReassigning(null)}
        title={t.reassignTitle}
        description={t.reassignBody}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReassigning(null)}>
              {t.cancel}
            </Button>
            <Button disabled={!target} loading={pending} onClick={() => reassigning && run(() => reassignMatch(jobId, reassigning.id, target), { success: t.reassigned, onSuccess: () => setReassigning(null) })}>
              {t.reassign}
            </Button>
          </>
        }
      >
        {reassigning && (
          <div className="grid grid-cols-[96px_1fr] items-start gap-4">
            <Thumb photo={reassigning.photo} />
            <SubjectSelect id="reassign-target" subjects={subjects} value={target} onChange={setTarget} exclude={reassigning.subjectId} />
          </div>
        )}
      </Modal>

      <Modal
        open={splitting !== null}
        onOpenChange={(o) => !o && setSplitting(null)}
        title={splitting ? t.splitTitle(splitting.ids.length, splitting.subject.firstName) : t.splitFallback}
        description={t.splitBody}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSplitting(null)}>
              {t.cancel}
            </Button>
            <Button
              disabled={!target}
              loading={pending}
              onClick={() =>
                splitting &&
                run(() => splitMatches(jobId, splitting.ids, target), {
                  success: t.moved,
                  onSuccess: () => {
                    setSplitting(null);
                    setSelected(new Set());
                  },
                })
              }
            >
              {t.move}
            </Button>
          </>
        }
      >
        <SubjectSelect id="split-target" subjects={subjects} value={target} onChange={setTarget} exclude={splitting?.subject.id} />
      </Modal>
    </div>
  );
}
