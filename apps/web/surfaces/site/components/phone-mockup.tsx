import type { Locale } from "@snapbell/sdk";
import { brandStyle } from "@snapbell/ui/lib/brand";
import { cn } from "@snapbell/ui/lib/cn";
import { Heart } from "lucide-react";
import { photoUri, PROOF_WATERMARK } from "@site/lib/placeholder";
import { commonMsgs } from "@site/messages/common";
import { StoreTabBar } from "./phone-frame";

export { PhoneFrame, StoreTabBar } from "./phone-frame";

const BRAND = "#2F6F73";

/** Static Family Store album screen used in the home hero. */
export function StoreAlbumScreen({ locale }: { locale: Locale }) {
  const t = commonMsgs[locale].phone;
  const photos = ["hero-ava-1", "hero-ava-2", "hero-ava-3", "hero-ava-4"].map((seed) => photoUri({ seed, watermark: PROOF_WATERMARK }));
  return (
    <div className="flex h-full flex-col bg-bg text-ink" style={brandStyle(BRAND)}>
      <div className="grid gap-2 bg-accent px-4 pt-10 pb-4 text-accent-ink">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="grid size-6 place-items-center rounded-full bg-accent-ink text-[10px] text-accent">B</span>
          Brightside Photo Co.
        </div>
        <div>
          <p className="text-base font-semibold">Ava Martinez</p>
          <p className="text-[11px] opacity-85">Maple Grove Elementary · Grade 2</p>
        </div>
        <span className="w-fit rounded-full bg-accent-ink/15 px-2 py-0.5 text-[10px] font-semibold">{t.daysLeft}</span>
      </div>
      <div className="flex gap-1.5 px-3 py-2 text-[10px]">
        {[t.all, "Classic", "Smile", "Fun"].map((c, i) => (
          <span key={c} className={cn("rounded-full border px-2 py-0.5", i === 0 ? "border-ink bg-ink text-bg" : "border-border")}>
            {c}
          </span>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-2 content-start gap-1.5 px-3">
        {photos.map((src, i) => (
          <div key={i} className="relative overflow-hidden rounded-md bg-sunken" style={{ aspectRatio: "4 / 5" }}>
            <img src={src} alt="" className="size-full object-cover" />
            <Heart className={cn("absolute top-1 right-1 size-4 text-white drop-shadow", i === 1 && "fill-current text-[#ff4d6d]")} aria-hidden />
          </div>
        ))}
      </div>
      <div className="mx-3 mb-2 rounded-lg bg-accent px-3 py-2 text-center text-xs font-semibold text-accent-ink">{t.shop}</div>
      <StoreTabBar locale={locale} active="photos" />
    </div>
  );
}

/** Check-in app screen: roster with reference photo status. */
export function CheckInScreen({ locale }: { locale: Locale }) {
  const t = commonMsgs[locale].phone.checkIn;
  const rows = [
    { name: "Ava Martinez", group: "Grade 2", done: true },
    { name: "Leo Martinez", group: "Grade 4", done: true },
    { name: "Mia Chen", group: "Grade 2", done: false, current: true },
    { name: "Noah Okafor", group: "K", done: false },
    { name: "Zoe Patel", group: "Grade 4", done: false },
    { name: "Eli Nguyen", group: "Grade 2", done: false },
  ];
  return (
    <div className="flex h-full flex-col bg-bg pt-9 text-ink">
      <div className="flex items-center justify-between px-4 pb-2">
        <div>
          <p className="text-[10px] text-muted">{t.job}</p>
          <p className="text-sm font-semibold">{t.title}</p>
        </div>
        <span className="rounded-full bg-sage/20 px-2 py-0.5 text-[9px] font-semibold text-ink">{t.offline}</span>
      </div>
      <div className="mx-4 mb-2 rounded-md border border-border bg-surface px-2 py-1.5 text-[10px] text-muted">{t.search}</div>
      <ul className="flex-1 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.name} className={cn("flex items-center gap-2 px-4 py-2", r.current && "bg-accent/20")}>
            <span className={cn("grid size-7 place-items-center rounded-full text-[9px] font-semibold", r.done ? "bg-success text-white" : "bg-sunken text-muted")}>
              {r.done ? "✓" : r.name.split(" ").map((p) => p[0]).join("")}
            </span>
            <span className="grid flex-1">
              <span className="text-[11px] font-medium">{r.name}</span>
              <span className="text-[9px] text-muted">{r.group}</span>
            </span>
            {r.current && <span className="rounded bg-ink px-1.5 py-0.5 text-[9px] text-bg">{t.takeRef}</span>}
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-3 border-t border-border bg-surface p-3 text-center text-[9px]">
        <span>
          <strong className="block text-sm">148</strong>{t.checkedIn}
        </span>
        <span>
          <strong className="block text-sm">264</strong>{t.toGo}
        </span>
        <span>
          <strong className="block text-sm">0</strong>{t.unsynced}
        </span>
      </div>
    </div>
  );
}
