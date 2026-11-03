import { Button } from "@snapbell/ui/button";
import { ErrorPage } from "@snapbell/ui/feedback";
import Link from "next/link";
import { getLocale } from "@admin/lib/i18n";
import { adminMsgs } from "@admin/messages/admin";

export default async function NotFound() {
  const locale = await getLocale();
  const t = adminMsgs[locale].notFound;
  return (
    <ErrorPage
      code={404}
      locale={locale}
      title={t.title}
      description={t.description}
      action={
        <Button asChild>
          <Link href="/admin/studios">{t.back}</Link>
        </Button>
      }
    />
  );
}
