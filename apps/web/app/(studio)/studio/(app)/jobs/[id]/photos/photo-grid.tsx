"use client";

import type { Photo } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { Chip } from "@snapbell/ui/chip";
import { EmptyState } from "@snapbell/ui/feedback";
import { useMessages } from "@snapbell/ui/locale";
import { Menu } from "@snapbell/ui/overlay";
import { Copy, Ellipsis, Images, Tag, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAction } from "@studio/components/use-action";
import { removePhoto, updatePhoto } from "@studio/lib/actions";
import { photosMsgs } from "@studio/messages/photos";

const PAGE = 120;
const LABELS = ["Yearbook", "ID card"];

export function PhotoGrid({ jobId, photos }: { jobId: string; photos: Photo[] }) {
  const { run } = useAction();
  const t = useMessages(photosMsgs).grid;
  const labelName = (l: string) => t.labels[l] ?? l;
  const [filter, setFilter] = useState<string>("all");
  const [limit, setLimit] = useState(PAGE);

  const tags = useMemo(() => [...new Set(photos.flatMap((p) => p.tags))].sort(), [photos]);
  const groups = useMemo(() => [...new Set(photos.map((p) => p.group).filter(Boolean) as string[])].sort(), [photos]);
  const filtered = photos.filter((p) => {
    if (filter === "all") return true;
    if (filter === "unmatched") return p.subjectIds.length === 0;
    if (filter === "duplicates") return Boolean(p.duplicateOfId);
    if (filter === "processing") return p.status !== "ready";
    if (filter.startsWith("tag:")) return p.tags.includes(filter.slice(4));
    if (filter.startsWith("group:")) return p.group === filter.slice(6);
    return true;
  });
  const dupes = photos.filter((p) => p.duplicateOfId).length;
  const processing = photos.filter((p) => p.status !== "ready").length;

  if (photos.length === 0) {
    return <EmptyState icon={<Images />} title={t.emptyTitle} description={t.emptyBody} />;
  }

  return (
    <section className="grid gap-4" aria-label={t.section}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">{t.count(photos.length)}</h2>
        {processing > 0 && <p className="text-sm text-muted">{t.processingCount(processing)}</p>}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip selected={filter === "all"} onClick={() => setFilter("all")}>{t.all}</Chip>
        <Chip selected={filter === "unmatched"} onClick={() => setFilter("unmatched")}>{t.unmatched}</Chip>
        {dupes > 0 && <Chip selected={filter === "duplicates"} onClick={() => setFilter("duplicates")}>{t.duplicates(dupes)}</Chip>}
        {processing > 0 && <Chip selected={filter === "processing"} onClick={() => setFilter("processing")}>{t.processing}</Chip>}
        {tags.map((tag) => (
          <Chip key={tag} selected={filter === `tag:${tag}`} onClick={() => setFilter(`tag:${tag}`)}>{tag}</Chip>
        ))}
        {groups.map((g) => (
          <Chip key={g} selected={filter === `group:${g}`} onClick={() => setFilter(`group:${g}`)}>{g}</Chip>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
        {filtered.slice(0, limit).map((p) => (
          <li key={p.id} className="group relative grid gap-1.5">
            <div className="relative overflow-hidden rounded-input bg-sunken" style={{ aspectRatio: p.width && p.height ? `${p.width} / ${p.height}` : "4 / 5" }}>
              {p.status === "ready" && p.thumbUrl ? (
                <img src={p.thumbUrl} alt={p.filename} loading="lazy" className="size-full object-cover" draggable={false} />
              ) : (
                <div className="grid size-full place-items-center text-xs text-muted">{p.status === "failed" ? t.processingFailed : t.processingTile}</div>
              )}
              <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
                {p.duplicateOfId && (
                  <Badge tone="warning">
                    <Copy /> {t.duplicate}
                  </Badge>
                )}
                {p.subjectIds.length === 0 && !p.group && <Badge tone="outline" className="bg-surface">{t.unmatched}</Badge>}
              </div>
              <div className="absolute top-1 right-1 opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                <Menu
                  label={t.actions}
                  trigger={
                    <Button variant="secondary" size="icon-sm" aria-label={t.actionsFor(p.filename)}>
                      <Ellipsis />
                    </Button>
                  }
                  items={[
                    ...LABELS.map((l) => ({
                      label: p.labels.includes(l) ? t.removeLabel(labelName(l)) : t.addLabel(labelName(l)),
                      icon: <Tag />,
                      onSelect: () =>
                        run(() => updatePhoto(jobId, p.id, { labels: p.labels.includes(l) ? p.labels.filter((x) => x !== l) : [...p.labels, l] }), { success: t.labelUpdated }),
                    })),
                    null,
                    { label: t.delete, icon: <Trash2 />, danger: true, onSelect: () => run(() => removePhoto(jobId, p.id), { success: t.deleted }) },
                  ]}
                />
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-1 text-xs text-muted">
              <span className="truncate">{p.filename}</span>
            </div>
            {(p.tags.length > 0 || p.group || p.labels.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {p.group && <Badge tone="sage">{p.group}</Badge>}
                {p.tags.map((tag) => (
                  <Badge key={tag} tone="neutral">{tag}</Badge>
                ))}
                {p.labels.map((l) => (
                  <Badge key={l} tone="accent">{labelName(l)}</Badge>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {filtered.length > limit && (
        <Button variant="outline" className="justify-self-center" onClick={() => setLimit((l) => l + PAGE)}>
          {t.showMore(filtered.length - limit)}
        </Button>
      )}
    </section>
  );
}
