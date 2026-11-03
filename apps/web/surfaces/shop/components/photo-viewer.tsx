"use client";

import type { Album, AlbumPhoto } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { cn } from "@snapbell/ui/lib/cn";
import { useMessages } from "@snapbell/ui/locale";
import { useToast } from "@snapbell/ui/toast";
import { ChevronLeft, ChevronRight, Heart, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { saveFavorites } from "@shop/actions";
import { photoMsgs } from "@shop/messages/photos";
import { viewerMsgs } from "@shop/messages/viewer";
import { ProtectionVeil } from "./protection-veil";
import { useProtection } from "./use-protection";

/** Screen 5: full-screen viewer. Swipe between photos, pinch or double-tap to zoom. */
export function PhotoViewer({
  code,
  photos,
  initialIndex,
  initialFavorites,
  protection,
}: {
  code: string;
  photos: AlbumPhoto[];
  initialIndex: number;
  initialFavorites: string[];
  protection: Album["job"]["protection"];
}) {
  const router = useRouter();
  const toast = useToast();
  const t = useMessages(viewerMsgs);
  const p = useMessages(photoMsgs);
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [, start] = useTransition();
  const hidden = useProtection(protection.blurOnFocusLoss);
  const photo = photos[index]!;
  const close = useCallback(() => router.push(`/shop/a/${code}`), [router, code]);

  // Start on the photo that was tapped.
  useEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = initialIndex * el.clientWidth;
  }, [initialIndex]);

  // Keep the URL shareable as the parent swipes.
  useEffect(() => {
    window.history.replaceState(window.history.state, "", `/shop/a/${code}/photo/${photo.id}`);
  }, [code, photo.id]);

  const goTo = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }, [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, goTo, index]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) {
      setIndex(i);
      setZoomed(false);
    }
  };

  const favorite = favorites.includes(photo.id);
  const toggleFavorite = () => {
    const previous = favorites;
    const next = favorite ? previous.filter((f) => f !== photo.id) : [...previous, photo.id];
    setFavorites(next);
    start(async () => {
      const res = await saveFavorites(code, next);
      if (!res.ok) {
        setFavorites(previous);
        toast({ title: p.favoriteFailed, description: res.message, tone: "danger" });
      }
    });
  };

  return (
    <div
      data-theme="dark"
      role="dialog"
      aria-modal="true"
      aria-label={t.dialog(index + 1, photos.length)}
      className="fixed inset-0 z-50 flex flex-col bg-bg text-ink"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between gap-2 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2">
        <Button variant="ghost" size="icon" onClick={close} aria-label={t.close}>
          <X className="size-6!" aria-hidden />
        </Button>
        <p className="text-sm text-muted tabular-nums" aria-live="polite">
          {index + 1} / {photos.length}
        </p>
        <Button variant="ghost" size="icon" onClick={toggleFavorite} aria-pressed={favorite} aria-label={favorite ? t.removeFavorite : t.addFavorite}>
          <Heart className={cn("size-6!", favorite && "fill-current text-[#ff4d6d]")} aria-hidden />
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        <ul
          ref={track}
          onScroll={onScroll}
          className={cn(
            "flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none]",
            zoomed && "overflow-x-hidden",
            hidden && "blur-2xl",
          )}
        >
          {photos.map((ph, i) => (
            <li key={ph.id} className="relative h-full w-full shrink-0 snap-center">
              {Math.abs(i - index) <= 1 ? (
                <ZoomableImage
                  src={ph.previewUrl}
                  alt={t.imageAlt(ph.tags[0] ?? p.photo, i + 1, photos.length)}
                  active={i === index}
                  onZoomChange={setZoomed}
                />
              ) : null}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label={t.previous}
          className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/80 disabled:opacity-0 md:grid"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === photos.length - 1}
          aria-label={t.next}
          className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/80 disabled:opacity-0 md:grid"
        >
          <ChevronRight className="size-6" aria-hidden />
        </button>
      </div>

      <div className="flex justify-center px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <Button asChild size="lg" className="w-full max-w-sm">
          <Link href={`/shop/a/${code}/shop?photo=${photo.id}`}>
            <ShoppingBag aria-hidden /> {t.useInProduct}
          </Link>
        </Button>
      </div>
      <ProtectionVeil visible={hidden} />
    </div>
  );
}

/** Double-tap or double-click toggles 2.5× at the tapped point; two fingers pinch; one finger pans while zoomed. */
function ZoomableImage({ src, alt, active, onZoomChange }: { src: string; alt: string; active: boolean; onZoomChange: (zoomed: boolean) => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState("50% 50%");
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    if (!active) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [active]);

  useEffect(() => onZoomChange(scale > 1), [scale, onZoomChange]);

  const toggleAt = (clientX: number, clientY: number, el: HTMLElement) => {
    if (scale > 1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    const r = el.getBoundingClientRect();
    setOrigin(`${((clientX - r.left) / r.width) * 100}% ${((clientY - r.top) / r.height) * 100}%`);
    setScale(2.5);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
    if (e.pointerType === "touch" && pointers.current.size === 1) {
      const now = Date.now();
      if (now - lastTap.current < 280) toggleAt(e.clientX, e.clientY, e.currentTarget);
      lastTap.current = now;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setScale(Math.min(4, Math.max(1, (pinchStart.current.scale * dist) / pinchStart.current.dist)));
    } else if (scale > 1 && pointers.current.size === 1) {
      setOffset((o) => ({ x: o.x + (e.clientX - prev.x) / scale, y: o.y + (e.clientY - prev.y) / scale }));
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (scale <= 1.02) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  };

  return (
    <div
      className="no-save grid h-full w-full place-items-center overflow-hidden"
      style={{ touchAction: scale > 1 ? "none" : "pan-x" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => toggleAt(e.clientX, e.clientY, e.currentTarget)}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="no-save pointer-events-none max-h-full max-w-full object-contain transition-transform duration-150 ease-out select-none"
        style={{ transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`, transformOrigin: origin }}
      />
    </div>
  );
}
