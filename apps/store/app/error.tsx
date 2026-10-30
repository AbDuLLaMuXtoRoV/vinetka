"use client";

import { Button } from "@snapbell/ui/button";
import { ErrorPage } from "@snapbell/ui/feedback";
import { useLocale } from "@snapbell/ui/locale";
import { miscMsgs } from "@/messages/misc";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  const t = miscMsgs[locale];
  return (
    <ErrorPage
      locale={locale}
      code={500}
      title={t.errorTitle}
      description={t.errorBody}
      action={
        <>
          <Button onClick={reset}>{t.tryAgain}</Button>
          <Button variant="outline" asChild>
            <a href="/">{t.startOver}</a>
          </Button>
        </>
      }
    />
  );
}
