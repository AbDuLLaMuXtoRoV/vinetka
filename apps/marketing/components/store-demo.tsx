"use client";

import { Button } from "@snapbell/ui/button";
import { cn } from "@snapbell/ui/lib/cn";
import { useLocale } from "@snapbell/ui/locale";
import { Check, ChevronLeft, Heart, Lock, RotateCcw } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { familyStoreMsgs } from "@/messages/family-store";
import { PhoneFrame, StoreTabBar } from "./phone-frame";

type Screen = "album" | "shop" | "checkout" | "done";
const SCREENS: Screen[] = ["album", "shop", "checkout", "done"];

export interface StoreDemoPrices {
  bundle: string;
  bundleValue: string;
  essentials: string;
  digital: string;
  shipping: string;
  tax: string;
  total: string;
}

/** Tap-through Family Store demo: album → shop → checkout → confirmation. */
export function StoreDemo({ photos, prices }: { photos: string[]; prices: StoreDemoPrices }) {
  const locale = useLocale();
  const t = familyStoreMsgs[locale].demo;
  const [screen, setScreen] = useState<Screen>("album");
  const [favorites, setFavorites] = useState<number[]>([0, 2]);
  const index = SCREENS.indexOf(screen);

  const toggleFavorite = (i: number) => setFavorites((f) => (f.includes(i) ? f.filter((x) => x !== i) : [...f, i]));

  return (
    <div className="grid justify-items-center gap-6">
      <ol className="flex flex-wrap justify-center gap-2" aria-label={t.stepsAria}>
        {SCREENS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => setScreen(s)}
              aria-current={screen === s ? "step" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-150",
                screen === s ? "border-ink bg-ink text-bg" : "border-border bg-surface hover:border-ink/40",
              )}
            >
              <span className="tabular-nums">{i + 1}</span> {t.steps[s]}
            </button>
          </li>
        ))}
      </ol>

      <PhoneFrame label={t.phone}>
        <div className="flex h-full flex-col bg-bg text-ink" style={{ "--sb-accent": "#2F6F73", "--sb-accent-ink": "#ffffff" } as CSSProperties}>
          <div className="flex items-center gap-2 bg-accent px-3 pt-9 pb-3 text-accent-ink">
            {index > 0 && screen !== "done" ? (
              <button type="button" onClick={() => setScreen(SCREENS[index - 1]!)} className="-ml-1 grid size-8 place-items-center rounded-full hover:bg-white/15" aria-label={t.back}>
                <ChevronLeft className="size-4" aria-hidden />
              </button>
            ) : (
              <span className="grid size-6 place-items-center rounded-full bg-accent-ink text-[10px] font-bold text-accent">B</span>
            )}
            <div className="grid">
              <span className="text-xs font-semibold">Brightside Photo Co.</span>
              <span className="text-[10px] opacity-85">{t.daysLeft}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" aria-live="polite">
            {screen === "album" && (
              <div className="grid gap-2 p-3">
                <p className="text-[11px] text-muted">{t.tapHeart}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {photos.map((src, i) => (
                    <div key={i} className="relative overflow-hidden rounded-md" style={{ aspectRatio: "4 / 5" }}>
                      <img src={src} alt={t.photoAlt(i + 1)} className="no-save size-full object-cover" draggable={false} />
                      <button
                        type="button"
                        onClick={() => toggleFavorite(i)}
                        aria-pressed={favorites.includes(i)}
                        aria-label={t.favoriteAria(i + 1)}
                        className="absolute top-0 right-0 grid size-9 place-items-center text-white drop-shadow"
                      >
                        <Heart className={cn("size-4", favorites.includes(i) && "fill-current text-[#ff4d6d]")} aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {screen === "shop" && (
              <div className="grid gap-2 p-3 text-[11px]">
                <div className="grid gap-1.5 rounded-lg border-2 border-accent bg-surface p-3">
                  <span className="w-fit rounded-full bg-accent px-2 py-0.5 text-[9px] font-semibold text-accent-ink">{t.suggested}</span>
                  <p className="text-sm font-semibold">Family Favorite</p>
                  <p className="text-muted">{t.bundleDesc(Math.max(1, favorites.length))}</p>
                  <div className="flex gap-1">
                    {favorites.slice(0, 3).map((i) => (
                      <img key={i} src={photos[i]} alt="" className="h-10 w-8 rounded object-cover" />
                    ))}
                  </div>
                  <p>
                    <strong className="text-sm">{prices.bundle}</strong> <span className="text-muted line-through">{prices.bundleValue}</span>
                  </p>
                </div>
                {[
                  ["Essentials", t.essentialsDesc, prices.essentials],
                  [t.digitalName, t.digitalDesc, prices.digital],
                ].map(([name, desc, price]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-border bg-surface p-2.5">
                    <span className="grid">
                      <span className="font-semibold">{name}</span>
                      <span className="text-muted">{desc}</span>
                    </span>
                    <span className="font-semibold">{price}</span>
                  </div>
                ))}
              </div>
            )}

            {screen === "checkout" && (
              <div className="grid gap-2 p-3 text-[11px]">
                <div className="grid gap-1 rounded-lg border border-border bg-surface p-2.5">
                  <p className="font-semibold">{t.contact}</p>
                  <p className="text-muted">Elena Martinez · (555) 555-0123</p>
                </div>
                <div className="grid gap-1 rounded-lg border border-border bg-surface p-2.5">
                  <p className="font-semibold">{t.delivery}</p>
                  <p className="text-muted">{t.deliveryValue}</p>
                </div>
                <dl className="grid gap-1 rounded-lg border border-border bg-surface p-2.5">
                  {[
                    ["Family Favorite", prices.bundle],
                    [t.shipping, prices.shipping],
                    [t.tax, prices.tax],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-muted">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-1 text-xs font-semibold">
                    <dt>{t.total}</dt>
                    <dd>{prices.total}</dd>
                  </div>
                </dl>
                <p className="flex items-center gap-1 text-[10px] text-muted">
                  <Lock className="size-3" aria-hidden /> {t.payWith}
                </p>
              </div>
            )}

            {screen === "done" && (
              <div className="grid justify-items-center gap-3 p-5 text-center text-[11px]">
                <span className="grid size-12 place-items-center rounded-full bg-success text-white">
                  <Check className="size-6" strokeWidth={3} aria-hidden />
                </span>
                <p className="text-sm font-semibold">{t.thanks}</p>
                <p className="text-muted">{t.confirmed}</p>
                <ol className="grid w-full gap-1 text-left">
                  {t.timeline.map((s, i) => (
                    <li key={s} className="flex items-center gap-2">
                      <span className={cn("size-2.5 rounded-full", i === 0 ? "bg-success" : "bg-border")} />
                      <span className={i === 0 ? "font-semibold" : "text-muted"}>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <div className="px-3 pb-2">
            {screen === "album" && (
              <button type="button" onClick={() => setScreen("shop")} className="w-full rounded-lg bg-accent py-2.5 text-xs font-semibold text-accent-ink">
                {t.shopCta}
              </button>
            )}
            {screen === "shop" && (
              <button type="button" onClick={() => setScreen("checkout")} className="w-full rounded-lg bg-accent py-2.5 text-xs font-semibold text-accent-ink">
                {t.addBundle(prices.bundle)}
              </button>
            )}
            {screen === "checkout" && (
              <button type="button" onClick={() => setScreen("done")} className="w-full rounded-lg bg-ink py-2.5 text-xs font-semibold text-bg">
                {t.pay(prices.total)}
              </button>
            )}
            {screen === "done" && (
              <button type="button" onClick={() => setScreen("album")} className="w-full rounded-lg border border-border py-2.5 text-xs font-semibold">
                {t.orderMore}
              </button>
            )}
          </div>
          <StoreTabBar locale={locale} active={screen === "album" ? "photos" : screen === "shop" ? "shop" : "cart"} />
        </div>
      </PhoneFrame>

      <Button variant="ghost" size="sm" onClick={() => setScreen("album")}>
        <RotateCcw aria-hidden /> {t.restart}
      </Button>
    </div>
  );
}
