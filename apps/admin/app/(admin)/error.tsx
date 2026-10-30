"use client";

import { Button } from "@snapbell/ui/button";
import { ErrorPage } from "@snapbell/ui/feedback";
import { useLocale } from "@snapbell/ui/locale";
import { adminMsgs } from "@/messages/admin";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  const t = adminMsgs[locale].error;
  return (
    <ErrorPage
      code={500}
      locale={locale}
      title={t.title}
      description={error.digest ? t.reference(error.digest) : t.apiDown}
      action={<Button onClick={reset}>{t.retry}</Button>}
    />
  );
}
