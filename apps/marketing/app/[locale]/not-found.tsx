"use client";

import { Button } from "@snapbell/ui/button";
import { ErrorPage } from "@snapbell/ui/feedback";
import { useLocale } from "@snapbell/ui/locale";
import Link from "next/link";
import { localePath } from "@/lib/i18n";
import { commonMsgs } from "@/messages/common";

/** Rendered inside the locale layout (unknown paths reach it through [...rest]). */
export default function NotFound() {
  const locale = useLocale();
  const t = commonMsgs[locale].notFound;
  return (
    <>
      <title>{`${t.metaTitle} · Snapbell`}</title>
      <ErrorPage
        locale={locale}
        code={404}
        title={t.title}
        description={t.description}
        action={
          <>
            <Button asChild>
              <Link href={localePath(locale, "/")}>{t.home}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={localePath(locale, "/find-my-photos")}>{t.findPhotos}</Link>
            </Button>
          </>
        }
      />
    </>
  );
}
