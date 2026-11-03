import { Skeleton } from "@snapbell/ui/feedback";
import { getLocale } from "@studio/lib/i18n";
import { commonMsgs } from "@studio/messages/common";

export default async function Loading() {
  const t = commonMsgs[await getLocale()];
  return (
    <div className="grid gap-6" aria-busy="true" aria-label={t.loading}>
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
      </div>
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}
