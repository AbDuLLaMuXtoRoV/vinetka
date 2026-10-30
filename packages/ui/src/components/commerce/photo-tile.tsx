"use client";

import { Check, Heart } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { uiMessages } from "../../lib/messages";
import { useLocale } from "../locale";

/**
 * Album grid tile. The image is already a watermarked preview from the API;
 * the tile adds the client-side deterrents: no long-press save, no drag, no context menu.
 */
export function PhotoTile({
  src,
  alt,
  aspectRatio = 4 / 5,
  favorite,
  onToggleFavorite,
  selected,
  onSelect,
  href,
  onOpen,
  badge,
  className,
}: {
  src: string;
  alt: string;
  aspectRatio?: number;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  /** Selection mode (e.g. choosing photos for a product). */
  selected?: boolean;
  onSelect?: () => void;
  href?: string;
  onOpen?: () => void;
  badge?: ReactNode;
  className?: string;
}) {
  const t = uiMessages[useLocale()];
  const image = (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      className="no-save size-full object-cover transition-transform duration-250 ease-out group-hover:scale-[1.02]"
    />
  );

  const opener = href ? (
    <a href={href} className="block size-full" aria-label={t.openPhoto(alt)}>
      {image}
    </a>
  ) : onOpen || onSelect ? (
    <button type="button" onClick={onSelect ?? onOpen} className="block size-full" aria-label={onSelect ? t.selectPhoto(alt) : t.openPhoto(alt)} aria-pressed={onSelect ? !!selected : undefined}>
      {image}
    </button>
  ) : (
    image
  );

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-input bg-sunken",
        selected && "ring-3 ring-accent ring-offset-2 ring-offset-bg",
        className,
      )}
      style={{ aspectRatio }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {opener}
      {badge && <div className="pointer-events-none absolute top-2 left-2">{badge}</div>}
      {selected && (
        <span className="pointer-events-none absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-accent text-accent-ink" aria-hidden>
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={!!favorite}
          aria-label={favorite ? t.removeFavorite(alt) : t.addFavorite(alt)}
          className="absolute top-1 right-1 grid size-11 place-items-center rounded-full text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)] transition-transform duration-150 active:scale-90"
        >
          <Heart className={cn("size-6", favorite && "fill-current text-[#ff4d6d]")} aria-hidden />
        </button>
      )}
    </div>
  );
}
