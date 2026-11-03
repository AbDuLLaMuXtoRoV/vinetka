import type { Metadata } from "next";
import { getSession, load } from "@studio/lib/api";
import { getLocale } from "@studio/lib/i18n";
import { settingsMsgs } from "@studio/messages/settings";
import { StudioSettingsForm } from "./studio-form";
import { TeamSection } from "./team";

export async function generateMetadata(): Promise<Metadata> {
  return { title: settingsMsgs[await getLocale()].studio.metaTitle };
}

export default async function StudioSettingsPage() {
  const { member, studio } = await getSession();
  const members = await load((c) => c.studio.members());
  const canEdit = member.role === "owner" || member.role === "admin";
  return (
    <div className="grid max-w-3xl gap-8">
      <StudioSettingsForm studio={studio} canEdit={canEdit} />
      <TeamSection members={members} me={member} />
    </div>
  );
}
