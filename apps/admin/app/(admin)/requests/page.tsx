import type { ContactRequestKind, ContactRequestStatus } from "@snapbell/sdk";
import { EmptyState } from "@snapbell/ui/feedback";
import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import { FilterSelect, SearchBar } from "@/components/search-bar";
import { AdminHeader } from "@/components/shell";
import { load } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { adminMsgs } from "@/messages/admin";
import { onboardingMsgs } from "@/messages/onboarding";
import { RequestCard } from "./request-card";

const STATUSES: ContactRequestStatus[] = ["new", "contacted", "converted", "archived"];
const KINDS: ContactRequestKind[] = ["partner", "contact", "demo", "switch", "data_request"];

export async function generateMetadata(): Promise<Metadata> {
  return { title: onboardingMsgs[await getLocale()].requests.title };
}

/** Contact-page and partner requests; studios are created from here. */
export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; kind?: string }> }) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const status = STATUSES.find((s) => s === sp.status);
  const kind = KINDS.find((k) => k === sp.kind);
  const locale = await getLocale();
  const t = onboardingMsgs[locale].requests;

  const [requests, studios] = await Promise.all([
    load((c) => c.admin.contactRequests({ status, kind, q: q || undefined })),
    load((c) => c.admin.studios()),
  ]);
  const studioNames = new Map(studios.map((s) => [s.studio.id, s.studio.name]));

  return (
    <>
      <AdminHeader title={t.title} description={t.description} />
      <SearchBar q={q} placeholder={t.placeholder} locale={locale}>
        <FilterSelect name="status" value={status ?? ""} label={t.status} options={STATUSES.map((s) => [s, t.statuses[s]])} locale={locale} />
        <FilterSelect name="kind" value={kind ?? ""} label={t.kind} options={KINDS.map((k) => [k, t.kinds[k]])} locale={locale} />
      </SearchBar>
      <p className="mb-4 text-xs text-muted">{adminMsgs[locale].count(requests.length)}</p>
      {requests.length === 0 ? (
        <EmptyState icon={<Inbox />} title={t.empty} />
      ) : (
        <div className="grid gap-4">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} studioName={r.studioId ? (studioNames.get(r.studioId) ?? null) : null} />
          ))}
        </div>
      )}
    </>
  );
}
