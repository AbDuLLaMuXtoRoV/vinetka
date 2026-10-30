"use client";

import { Button } from "@snapbell/ui/button";
import { ErrorPage } from "@snapbell/ui/feedback";
import { useLocale } from "@snapbell/ui/locale";
import { commonMsgs } from "@/messages/common";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  const t = commonMsgs[locale].appError;
  const offline = /fetch failed|ECONNREFUSED|network/i.test(error.message);
  return (
    <ErrorPage
      code={500}
      locale={locale}
      title={offline ? t.offlineTitle : t.title}
      description={offline ? t.offlineDescription : t.description}
      action={
        <>
          <Button onClick={reset}>{t.retry}</Button>
          <Button variant="outline" asChild>
            <a href="/home">{t.home}</a>
          </Button>
        </>
      }
    />
  );
}
