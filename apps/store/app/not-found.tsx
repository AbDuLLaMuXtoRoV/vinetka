import { Button } from "@snapbell/ui/button";
import { ErrorPage } from "@snapbell/ui/feedback";
import Link from "next/link";
import { getLocale } from "@/lib/i18n";
import { serverMsgs } from "@/messages/server";

export default async function NotFound() {
  const locale = await getLocale();
  const t = serverMsgs[locale].notFound;
  return (
    <ErrorPage
      locale={locale}
      code={404}
      title={t.title}
      description={t.body}
      action={
        <Button asChild>
          <Link href="/">{t.enterCode}</Link>
        </Button>
      }
    />
  );
}
