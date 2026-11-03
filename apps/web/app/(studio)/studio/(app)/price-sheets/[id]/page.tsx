import { platformFeeBpsFor } from "@snapbell/sdk";
import type { Metadata } from "next";
import { PageHeader } from "@studio/components/page-header";
import { load, requireRole } from "@studio/lib/api";
import { getLocale } from "@studio/lib/i18n";
import { priceSheetMsgs } from "@studio/messages/price-sheets";
import { PriceSheetEditor } from "./editor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: priceSheetMsgs[await getLocale()].editor.metaTitle };
}

export default async function PriceSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { studio } = await requireRole(["owner", "admin"]);
  const sheet = await load((c) => c.priceSheets.get(id));
  const t = priceSheetMsgs[await getLocale()].editor;
  return (
    <>
      <PageHeader
        back={{ href: "/studio/price-sheets", label: t.back }}
        title={sheet.name}
        description={t.usedBy(sheet.labName, sheet.jobsUsing)}
      />
      <PriceSheetEditor sheet={sheet} platformFeeBps={platformFeeBpsFor(studio.ytdSalesCents)} />
    </>
  );
}
