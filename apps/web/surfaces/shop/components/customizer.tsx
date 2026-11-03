"use client";

import { RETOUCH_ADDON, type Album, type AlbumPhoto, type CartItem, type Customization, type ShopProduct } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { Alert } from "@snapbell/ui/feedback";
import { Input } from "@snapbell/ui/input";
import { cn } from "@snapbell/ui/lib/cn";
import { useFormatters, useMessages } from "@snapbell/ui/locale";
import { Slider } from "@snapbell/ui/slider";
import { Switch } from "@snapbell/ui/switch";
import { ArrowLeft, Minus, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { addToCart } from "@shop/actions";
import { customizerMsgs } from "@shop/messages/customizer";

// Product options (ids are sent to the lab; labels come from messages/customizer), not UI colors.
// The preview mimics the physical print, so it uses fixed print colors rather than theme tokens.
const BACKGROUNDS = [
  { id: "original", swatch: null },
  { id: "cream", swatch: "#f3ede2" },
  { id: "slate", swatch: "#5b6b7f" },
  { id: "sage", swatch: "#9db5a0" },
  { id: "black", swatch: "#1c1b1f" },
] as const;

const THEMES = ["classic", "spirit", "minimal"] as const;

type Tab = "photo" | "crop" | "style" | "text";

interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Largest crop at the product's aspect ratio, scaled down by `zoom`, panned to (cx, cy) as a 0..1 center. */
function cropFor(photo: AlbumPhoto, aspect: number, zoom: number, cx: number, cy: number): Crop {
  const imageAspect = photo.width / photo.height;
  let w = imageAspect > aspect ? aspect / imageAspect : 1;
  let h = imageAspect > aspect ? 1 : imageAspect / aspect;
  w /= zoom;
  h /= zoom;
  const x = Math.min(1 - w, Math.max(0, cx - w / 2));
  const y = Math.min(1 - h, Math.max(0, cy - h / 2));
  return { x, y, width: w, height: h };
}

/** Screen 7: live preview with controls in a bottom panel (side panel on desktop). */
export function Customizer({
  album,
  product,
  initialPhotoId,
  editing,
}: {
  album: Album;
  product: ShopProduct;
  initialPhotoId: string | null;
  editing: CartItem | null;
}) {
  const m = useMessages(customizerMsgs);
  const fmt = useFormatters();
  const slots = Math.max(1, product.slots);
  const startPhotos = editing?.photoIds.length
    ? editing.photoIds
    : [initialPhotoId ?? album.favorites[0] ?? album.photos[0]!.id, ...album.photos.map((p) => p.id)].filter((id, i, a) => a.indexOf(id) === i);
  const [slotPhotos, setSlotPhotos] = useState<string[]>(startPhotos.slice(0, slots));
  const [activeSlot, setActiveSlot] = useState(0);
  const initialCrop = editing?.customization?.crop;
  const [zoom, setZoom] = useState(() => {
    const p = album.photos.find((x) => x.id === startPhotos[0]);
    if (!initialCrop || !p) return 1;
    return Math.max(1, cropFor(p, product.aspectRatio, 1, 0.5, 0.5).width / initialCrop.width);
  });
  const [center, setCenter] = useState(initialCrop ? { x: initialCrop.x + initialCrop.width / 2, y: initialCrop.y + initialCrop.height / 2 } : { x: 0.5, y: 0.4 });
  const [background, setBackground] = useState<string>(editing?.customization?.background ?? "original");
  const [theme, setTheme] = useState<string>(editing?.customization?.theme ?? "classic");
  const [nameText, setNameText] = useState(editing?.customization?.nameText ?? (album.subject ? album.subject.firstName : ""));
  const [retouch, setRetouch] = useState(editing?.customization?.retouch ?? false);
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [tab, setTab] = useState<Tab>("crop");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const photo = album.photos.find((p) => p.id === slotPhotos[0]) ?? album.photos[0]!;
  const crop = useMemo(() => cropFor(photo, product.aspectRatio, zoom, center.x, center.y), [photo, product.aspectRatio, zoom, center]);
  const croppedLongEdge = Math.max(crop.width * photo.width, crop.height * photo.height);
  const lowRes = product.minLongEdgePx > 0 && croppedLongEdge < product.minLongEdgePx;
  const unit = product.priceCents + (retouch ? RETOUCH_ADDON.priceCents : 0);
  const bg = BACKGROUNDS.find((b) => b.id === background) ?? BACKGROUNDS[0];

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.current.x) / r.width) * crop.width;
    const dy = ((e.clientY - drag.current.y) / r.height) * crop.height;
    drag.current = { x: e.clientX, y: e.clientY };
    setCenter((c) => ({
      x: Math.min(1 - crop.width / 2, Math.max(crop.width / 2, c.x - dx)),
      y: Math.min(1 - crop.height / 2, Math.max(crop.height / 2, c.y - dy)),
    }));
  };

  const save = () => {
    setError(null);
    const customization: Customization = {
      crop,
      background: background === "original" ? null : background,
      theme,
      nameText: nameText.trim() || null,
      retouch,
    };
    start(async () => {
      const res = await addToCart(
        { kind: "product", refId: product.id, quantity, albumCode: album.code, subjectId: album.subject?.id ?? null, photoIds: slotPhotos, customization },
        { then: "cart", replaceId: editing?.id },
      );
      if (!res.ok) setError(res.message);
    });
  };

  const imageStyle = {
    width: `${100 / crop.width}%`,
    height: `${100 / crop.height}%`,
    left: `${(-crop.x / crop.width) * 100}%`,
    top: `${(-crop.y / crop.height) * 100}%`,
  };

  const preview = (
    <div
      className={cn("relative mx-auto w-full shadow-overlay transition-[padding] duration-250", theme === "minimal" ? "rounded-none" : "rounded-[4px]")}
      style={{
        aspectRatio: product.aspectRatio,
        // "contain" inside the preview area (a size container).
        width: `min(100cqw, calc(100cqh * ${product.aspectRatio}))`,
        padding: bg.swatch ? "6%" : 0,
        background: bg.swatch ?? "transparent",
      }}
    >
      <div
        ref={frame}
        className="no-save relative size-full cursor-grab touch-none overflow-hidden bg-sunken active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={m.dragLabel}
        role="img"
      >
        <img src={photo.previewUrl} alt="" draggable={false} className="no-save pointer-events-none absolute max-w-none select-none" style={imageStyle} />
        {retouch && <div className="pointer-events-none absolute inset-0 bg-white/5 backdrop-saturate-[1.08]" aria-hidden />}
        {nameText.trim() && (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 px-3 py-2 text-center font-semibold",
              theme === "spirit" && "bg-accent text-sm tracking-[0.2em] text-accent-ink uppercase",
              theme === "classic" && "bg-gradient-to-t from-black/60 to-transparent pt-8 text-lg text-white",
              theme === "minimal" && "bg-white/85 text-xs tracking-widest text-[#1c1b1f] uppercase",
            )}
          >
            {nameText.trim()}
          </div>
        )}
        {slots > 1 && slotPhotos[1] && (
          <img
            src={album.photos.find((p) => p.id === slotPhotos[1])?.thumbUrl}
            alt=""
            draggable={false}
            className="no-save pointer-events-none absolute top-3 right-3 w-1/3 rounded-[4px] border-2 border-white object-cover shadow-overlay"
            style={{ aspectRatio: 0.8 }}
          />
        )}
      </div>
    </div>
  );

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "photo", label: slots > 1 ? m.tabPhotos : m.tabPhoto },
    { id: "crop", label: m.tabCrop },
    { id: "style", label: m.tabStyle },
    ...(product.customizable ? [{ id: "text" as const, label: m.tabName }] : []),
  ];

  return (
    <div className="mx-auto grid max-w-content lg:grid-cols-[1fr_24rem] lg:gap-8 lg:px-4 lg:py-6">
      <div className="flex items-center gap-2 px-2 pt-2 lg:col-span-2 lg:px-0 lg:pt-0">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/shop/a/${album.code}/shop`} aria-label={m.back}>
            <ArrowLeft className="size-5!" aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="text-base font-semibold">{product.name}</h1>
          <p className="text-xs text-muted">{m.preview}</p>
        </div>
      </div>

      <div className="bg-sunken/50 p-6 lg:rounded-card">
        <div className="grid h-[calc(100dvh-33rem)] min-h-52 place-items-center lg:h-[32rem]" style={{ containerType: "size" }}>
          {preview}
        </div>
      </div>

      <section
        aria-label={m.panelLabel}
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 grid gap-4 rounded-t-sheet border-t border-border bg-surface px-4 pt-2 pb-4 shadow-overlay md:bottom-0 lg:static lg:rounded-card lg:border lg:pt-4 lg:shadow-none"
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-ink/15 lg:hidden" aria-hidden />
        <div role="tablist" aria-label={m.optionsLabel} className="grid grid-flow-col gap-1 rounded-input bg-sunken p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn("h-10 rounded-[6px] text-sm font-medium", tab === t.id ? "bg-surface shadow-sm" : "text-muted")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div id={`panel-${tab}`} role="tabpanel" className="min-h-28">
          {tab === "photo" && (
            <div className="grid gap-3">
              {slots > 1 && (
                <div className="flex gap-2">
                  {Array.from({ length: slots }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveSlot(i)}
                      aria-pressed={activeSlot === i}
                      className={cn("h-9 rounded-input border px-3 text-sm", activeSlot === i ? "border-ink bg-ink text-bg" : "border-border")}
                    >
                      {i === 0 ? m.mainPhoto : m.photoN(i + 1)}
                    </button>
                  ))}
                </div>
              )}
              <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {album.photos.map((p, i) => {
                  const selected = slotPhotos[activeSlot] === p.id;
                  return (
                    <li key={p.id} className="shrink-0">
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={m.usePhoto(i + 1)}
                        onClick={() => {
                          setSlotPhotos((s) => {
                            const next = [...s];
                            next[activeSlot] = p.id;
                            return next;
                          });
                          if (activeSlot === 0) {
                            setZoom(1);
                            setCenter({ x: 0.5, y: 0.4 });
                          }
                        }}
                        className={cn("block overflow-hidden rounded-input", selected && "ring-3 ring-accent ring-offset-2 ring-offset-surface")}
                      >
                        <img src={p.thumbUrl} alt="" draggable={false} className="no-save h-20 w-16 object-cover" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {tab === "crop" && (
            <div className="grid gap-2">
              <div className="flex justify-between text-sm">
                <span>{m.zoom}</span>
                <span className="text-muted tabular-nums">{Math.round(zoom * 100)}%</span>
              </div>
              <Slider value={zoom} onValueChange={setZoom} min={1} max={3} step={0.05} aria-label={m.zoom} aria-valuetext={`${Math.round(zoom * 100)}%`} />
              <p className="text-xs text-muted">{m.cropNote(product.name)}</p>
            </div>
          )}

          {tab === "style" && (
            <div className="grid gap-4">
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">{m.background}</legend>
                <div className="flex flex-wrap gap-2">
                  {BACKGROUNDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      aria-pressed={background === b.id}
                      onClick={() => setBackground(b.id)}
                      className={cn("flex h-10 items-center gap-2 rounded-input border px-3 text-sm", background === b.id ? "border-ink ring-1 ring-ink" : "border-border")}
                    >
                      <span className="size-4 rounded-full border border-border" style={{ background: b.swatch ?? "conic-gradient(#ccc 25%, #fff 0 50%, #ccc 0 75%, #fff 0)" }} aria-hidden />
                      {m.backgrounds[b.id]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">{m.theme}</legend>
                <div className="flex flex-wrap gap-2">
                  {THEMES.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={theme === id}
                      onClick={() => setTheme(id)}
                      className={cn("h-10 rounded-input border px-3 text-sm", theme === id ? "border-ink bg-ink text-bg" : "border-border")}
                    >
                      {m.themes[id]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Switch
                id="retouch"
                checked={retouch}
                onCheckedChange={setRetouch}
                label={m.retouch(fmt.money(RETOUCH_ADDON.priceCents))}
                description={m.retouchNote}
              />
            </div>
          )}

          {tab === "text" && (
            <div className="grid gap-2">
              <label htmlFor="name-text" className="text-sm font-medium">
                {m.nameLabel}
              </label>
              <Input id="name-text" value={nameText} maxLength={24} onChange={(e) => setNameText(e.target.value)} placeholder={m.namePlaceholder} />
              <p className="text-xs text-muted">{m.charsLeft(24 - nameText.length)}</p>
            </div>
          )}
        </div>

        {lowRes && (
          <Alert tone="warning" title={m.lowResTitle}>
            {m.lowResBody(product.name)}
          </Alert>
        )}
        {error && <Alert tone="danger">{error}</Alert>}

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-input border border-border" role="group" aria-label={m.quantity}>
            <button type="button" className="grid size-11 place-items-center disabled:opacity-40" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label={m.decrease}>
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="w-6 text-center tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <button type="button" className="grid size-11 place-items-center" onClick={() => setQuantity((q) => Math.min(20, q + 1))} aria-label={m.increase}>
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <Button size="lg" className="flex-1" loading={pending} onClick={save}>
            {lowRes && <TriangleAlert aria-hidden />}
            {editing ? m.update : m.add} · {fmt.money(unit * quantity)}
          </Button>
        </div>
      </section>
    </div>
  );
}
