import { Button } from "@snapbell/ui/button";
import { ErrorPage } from "@snapbell/ui/feedback";
import Link from "next/link";
import { getLocale } from "@studio/lib/i18n";
import { commonMsgs } from "@studio/messages/common";

export default async function NotFound() {
  const locale = await getLocale();
  const t = commonMsgs[locale].notFound;
  return (
    <ErrorPage
      code={404}
      locale={locale}
      title={t.title}
      description={t.description}
      action={
        <Button asChild>
          <Link href="/studio/home">{t.back}</Link>
        </Button>
      }
    />
  );
}
