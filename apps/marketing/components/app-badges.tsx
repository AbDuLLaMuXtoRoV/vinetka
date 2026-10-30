import type { Locale } from "@snapbell/sdk";
import { cn } from "@snapbell/ui/lib/cn";
import { localePath } from "@/lib/i18n";
import { commonMsgs } from "@/messages/common";
import { Smartphone, Play } from "lucide-react";

/** Generic store badges for the check-in app (no third-party marks). */
export function AppBadges({ locale, className, tone = "dark" }: { locale: Locale; className?: string; tone?: "dark" | "light" }) {
  const t = commonMsgs[locale].badges;
  const href = localePath(locale, "/features/check-in#download");
  const badge = cn(
    "inline-flex h-12 min-w-40 items-center gap-3 rounded-input px-4 transition-shadow duration-150 hover:shadow-hover",
    tone === "dark" ? "bg-ink text-bg" : "border border-border bg-surface text-ink",
  );
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <a href={href} className={badge} aria-label={t.iosAria}>
        <Smartphone className="size-6" aria-hidden />
        <span className="grid text-left leading-tight">
          <span className="text-[10px] opacity-80">{t.downloadFor}</span>
          <span className="text-sm font-semibold">{t.ios}</span>
        </span>
      </a>
      <a href={href} className={badge} aria-label={t.androidAria}>
        <Play className="size-6" aria-hidden />
        <span className="grid text-left leading-tight">
          <span className="text-[10px] opacity-80">{t.getItFor}</span>
          <span className="text-sm font-semibold">{t.android}</span>
        </span>
      </a>
    </div>
  );
}
