import type { ReactNode } from "react";
import { PageHeader } from "@studio/components/page-header";
import { canSeeMoney, getSession } from "@studio/lib/api";
import { getLocale } from "@studio/lib/i18n";
import { settingsMsgs } from "@studio/messages/settings";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const { member } = await getSession();
  const t = settingsMsgs[await getLocale()];
  return (
    <>
      <PageHeader title={t.title} />
      <SettingsTabs showPayments={canSeeMoney(member.role)} />
      <div className="mt-6">{children}</div>
    </>
  );
}
