import type { Metadata } from "next";
import { AdminHeader } from "@admin/components/shell";
import { load } from "@admin/lib/api";
import { getLocale } from "@admin/lib/i18n";
import { adminMsgs } from "@admin/messages/admin";
import { FlagsClient } from "./flags-client";

export async function generateMetadata(): Promise<Metadata> {
  return { title: adminMsgs[await getLocale()].flags.title };
}

export default async function FlagsPage() {
  const t = adminMsgs[await getLocale()].flags;
  const [flags, studios] = await Promise.all([load((c) => c.admin.flags()), load((c) => c.admin.studios())]);
  return (
    <>
      <AdminHeader title={t.title} description={t.description} />
      <FlagsClient flags={flags} studios={studios.map((s) => ({ id: s.studio.id, name: s.studio.name }))} />
    </>
  );
}
