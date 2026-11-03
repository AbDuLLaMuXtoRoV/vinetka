import type { Metadata } from "next";
import { requireRole } from "@studio/lib/api";
import { getLocale } from "@studio/lib/i18n";
import { settingsMsgs } from "@studio/messages/settings";
import { PaymentsClient } from "./payments-client";

export async function generateMetadata(): Promise<Metadata> {
  return { title: settingsMsgs[await getLocale()].payments.metaTitle };
}

export default async function PaymentsPage() {
  const { studio } = await requireRole(["owner", "admin"]);
  return <PaymentsClient studio={studio} />;
}
