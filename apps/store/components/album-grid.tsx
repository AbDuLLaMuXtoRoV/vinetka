"use client";

import type { Album, AlbumPhoto } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Chip } from "@snapbell/ui/chip";
import { PhotoTile } from "@snapbell/ui/commerce/photo-tile";
import { EmptyState } from "@snapbell/ui/feedback";
import { cn } from "@snapbell/ui/lib/cn";
import { useMessages } from "@snapbell/ui/locale";
import { useToast } from "@snapbell/ui/toast";
import { Heart, Hourglass, ScanFace, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveFavorites } from "@/app/actions";
import { albumMsgs } from "@/messages/album";
import { photoMsgs } from "@/messages/photos";
import { ProtectionVeil } from "./protection-veil";
import { useProtection } from "./use-protection";

type Filter = { kind: "all" } | { kind: "favorites" } | { kind: "tag"; value: string } | { kind: "group"; value: string };

/** Screen 3: album grid with filters, favorites, the sticky shop bar and photo protection. */
export function AlbumGrid({
  code,
  photos,
  filters,
  initialFavorites,
  protection,
  state,
  childName,
  findMeAvailable,
}: {
  code: string;
  photos: AlbumPhoto[];
  filters: Album["filters"];
  initialFavorites: string[];
  protection: Album["job"]["protection"];
  state: Album["state"];
  childName: string | null;
  findMeAvailable: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const t = useMessages(albumMsgs);
  const p = useMessages(photoMsgs);
  const [favorites, setFavorites] = useState<string[]>(initialFavorites);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [, start] = useTransition();
  const hidden = useProtection(protection.blurOnFocusLoss);

  const visible = useMemo(() => {
    switch (filter.kind) {
      case "all":
        return photos;
      case "favorites":
        return photos.filter((p) => favorites.includes(p.id));
      case "tag":
        return photos.filter((p) => p.tags.includes(filter.value));
      case "group":
        return photos.filter((p) => p.group === filter.value);
    }
  }, [photos, favorites, filter]);

  const toggleFavorite = (id: string) => {
    const previous = favorites;
    const next = previous.includes(id) ? previous.filter((f) => f !== id) : [...previous, id];
    setFavorites(next);
    start(async () => {
      const res = await saveFavorites(code, next);
      if (!res.ok) {
        setFavorites(previous);
        toast({ title: p.favoriteFailed, description: res.message, tone: "danger" });
      }
    });
  };

  if (state === "matching" || photos.length === 0) {
    return (
      <EmptyState
        icon={<Hourglass />}
        title={childName ? t.findingNamed(childName) : t.finding}
        description={t.findingBody}
        action={
          findMeAvailable ? (
            <Button asChild variant="outline">
              <Link href={`/a/${code}/find-me`}>
                <ScanFace aria-hidden /> {t.findWithSelfie}
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  const isActive = (f: Filter) =>
    f.kind === filter.kind && ("value" in f ? "value" in filter && filter.value === f.value : true);

  return (
    <div onContextMenu={(e) => protection.blockDownload && e.preventDefault()} className="grid gap-4">
      {findMeAvailable && (
        <Link
          href={`/a/${code}/find-me`}
          className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 transition-shadow duration-150 hover:shadow-hover"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
            <ScanFace className="size-5" aria-hidden />
          </span>
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">{t.findCardTitle}</span>
            <span className="text-xs text-muted">{t.findCardBody}</span>
          </span>
        </Link>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="toolbar" aria-label={t.filterLabel}>
        <Chip selected={isActive({ kind: "all" })} onClick={() => setFilter({ kind: "all" })}>
          {t.all} <span className="text-xs opacity-70">{photos.length}</span>
        </Chip>
        <Chip selected={isActive({ kind: "favorites" })} onClick={() => setFilter({ kind: "favorites" })}>
          <Heart aria-hidden /> {t.favorites} <span className="text-xs opacity-70">{favorites.length}</span>
        </Chip>
        {filters.tags.map((t) => (
          <Chip key={`t-${t}`} selected={isActive({ kind: "tag", value: t })} onClick={() => setFilter({ kind: "tag", value: t })}>
            {t}
          </Chip>
        ))}
        {filters.groups.map((g) => (
          <Chip key={`g-${g}`} selected={isActive({ kind: "group", value: g })} onClick={() => setFilter({ kind: "group", value: g })}>
            {g}
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title={filter.kind === "favorites" ? t.noFavorites : t.noPhotos}
          description={filter.kind === "favorites" ? t.noFavoritesBody : t.noPhotosBody}
        />
      ) : (
        <ul
          className={cn(
            "grid grid-cols-2 gap-2 transition-[filter] duration-150 md:grid-cols-4 md:gap-3 lg:grid-cols-5",
            hidden && "blur-2xl",
          )}
          aria-label={t.gridLabel}
        >
          {visible.map((photo, i) => (
            <li key={photo.id}>
              <PhotoTile
                src={photo.thumbUrl}
                alt={`${photo.tags[0] ?? p.photo} ${i + 1}`}
                aspectRatio={4 / 5}
                onOpen={() => router.push(`/a/${code}/photo/${photo.id}`)}
                favorite={favorites.includes(photo.id)}
                onToggleFavorite={() => toggleFavorite(photo.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <ProtectionVeil visible={hidden} />

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 px-4 pb-3 md:bottom-0 md:pb-6">
        <div className="mx-auto flex max-w-content items-center justify-between gap-3 rounded-card border border-border bg-surface/95 p-3 shadow-overlay backdrop-blur md:max-w-xl">
          <p className="pl-1 text-sm">
            {favorites.length > 0 ? (
              <>
                <strong>{favorites.length}</strong> {t.favoritesSaved(favorites.length)}
              </>
            ) : (
              <span className="text-muted">{t.tapHeart}</span>
            )}
          </p>
          <Button asChild>
            <Link href={`/a/${code}/shop`}>
              <ShoppingBag aria-hidden /> {t.shop}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
