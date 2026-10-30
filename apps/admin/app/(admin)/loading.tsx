import { Skeleton } from "@snapbell/ui/feedback";
import { getLocale } from "@/lib/i18n";
import { adminMsgs } from "@/messages/admin";

export default async function Loading() {
  const t = adminMsgs[await getLocale()];
  return (
    <div className="grid gap-4" aria-busy="true" aria-label={t.loading}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}
