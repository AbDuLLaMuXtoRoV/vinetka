import type { Metadata } from "next";
import { AccountView } from "@shop/components/account-view";
import { LoadErrorView } from "@shop/components/load-error";
import { load } from "@shop/lib/api";
import { getLocale } from "@shop/lib/i18n";
import { metaMsgs } from "@shop/messages/meta";

export async function generateMetadata(): Promise<Metadata> {
  return { title: metaMsgs[await getLocale()].account };
}

export default async function AccountPage() {
  const res = await load((c) => c.account.get());
  if (!res.ok) return <LoadErrorView error={res.error} />;
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
      <AccountView account={res.data} />
    </div>
  );
}
