"use client";

import type { AlbumType, StudioBranding } from "@snapbell/sdk";
import { brandStyle } from "@snapbell/ui/lib/brand";
import { useFormatters, useMessages } from "@snapbell/ui/locale";
import { Heart, ScanFace, ShoppingBag } from "lucide-react";
import { jobsMsgs } from "@/messages/jobs";

/** Phone mockup of the Family Store album, driven by unsaved form state ("what parents see"). */
export function ParentPreview({
  studio,
  organizationName,
  jobName,
  albumType,
  deadline,
  watermark,
}: {
  studio: StudioBranding;
  organizationName: string;
  jobName: string;
  albumType: AlbumType;
  deadline: string | null;
  watermark: boolean;
}) {
  const t = useMessages(jobsMsgs).preview;
  const fmt = useFormatters();
  const cd = fmt.countdown(deadline);
  const childLine = albumType === "personal" ? t.sampleChild : albumType === "team" ? t.teamAlbum : t.openAlbum;
  return (
    <figure className="grid justify-items-center gap-3">
      <div className="w-[260px] rounded-[2.25rem] border-[6px] border-ink bg-ink p-1 shadow-overlay" style={brandStyle(studio.brandColor)}>
        <div className="overflow-hidden rounded-[1.75rem] bg-bg">
          <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2.5">
            {studio.logoUrl ? <img src={studio.logoUrl} alt="" className="size-6 rounded object-contain" /> : <span className="size-6 rounded bg-accent" aria-hidden />}
            <span className="truncate text-xs font-semibold">{studio.name}</span>
          </div>
          <div className="grid gap-0.5 px-3 pt-3">
            <p className="truncate text-sm font-semibold">{childLine}</p>
            <p className="truncate text-[11px] text-muted">
              {organizationName || t.organization} · {jobName || t.jobName}
            </p>
            <p className="text-[11px] font-medium">
              {cd ? (cd.closed ? t.closed : t.orderBy(fmt.date(deadline!, { month: "short", day: "numeric" }), cd.label)) : t.noDeadline}
            </p>
          </div>
          {albumType !== "personal" && (
            <div className="mx-3 mt-2 flex items-center gap-1.5 rounded-input bg-accent px-2 py-1.5 text-[11px] font-medium text-accent-ink">
              <ScanFace className="size-3.5" aria-hidden /> {t.findMe}
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5 p-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="relative aspect-[4/5] overflow-hidden rounded-[6px]"
                style={{ background: `linear-gradient(160deg, hsl(${200 + i * 25} 18% 72%), hsl(${200 + i * 25} 20% 38%))` }}
              >
                <div className="absolute bottom-0 left-1/2 h-1/2 w-3/4 -translate-x-1/2 rounded-t-full bg-white/25" />
                <div className="absolute top-[22%] left-1/2 size-[30%] -translate-x-1/2 rounded-full bg-white/35" />
                {watermark && <span className="absolute inset-0 grid -rotate-[28deg] place-items-center text-[9px] font-bold tracking-wider text-white/50">{t.proof}</span>}
                <Heart className="absolute top-1 right-1 size-3.5 text-white" aria-hidden />
              </div>
            ))}
          </div>
          <div className="m-3 mt-0 flex items-center justify-center gap-1.5 rounded-input bg-accent py-2 text-xs font-semibold text-accent-ink">
            <ShoppingBag className="size-3.5" aria-hidden /> {t.shop}
          </div>
        </div>
      </div>
      <figcaption className="text-xs text-muted">{t.caption}</figcaption>
    </figure>
  );
}
