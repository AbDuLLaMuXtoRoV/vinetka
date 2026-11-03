import { formatters, isLocale } from "@snapbell/sdk";
import type { Metadata } from "next";
import { getSession } from "@studio/lib/api";
import { env } from "@studio/lib/env";
import { getLocale } from "@studio/lib/i18n";
import { getJob, getSubjects } from "@studio/lib/queries";
import { printMsgs } from "@studio/messages/roster";
import { PrintControls } from "./print-controls";

export async function generateMetadata(): Promise<Metadata> {
  return { title: printMsgs[await getLocale()].metaTitle };
}

/** Print-optimized code cards (8 per page) plus a flyer for Team/Open albums. */
export default async function PrintCodesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string; plang?: string }> }) {
  const { id } = await params;
  const { view = "cards", plang } = await searchParams;
  // Families read these: the print language can differ from the studio's app language.
  const uiLocale = await getLocale();
  const printLocale = isLocale(plang) ? plang : uiLocale;
  const t = printMsgs[printLocale];
  const fmt = formatters(printLocale);
  const [{ studio }, job, subjects] = await Promise.all([getSession(), getJob(id), getSubjects(id)]);
  const storeHost = env.storeUrl.replace(/^https?:\/\//, "");
  const shared = job.albumType !== "personal";

  return (
    <div className="grid gap-6">
      <PrintControls jobId={id} view={view} printLocale={printLocale} />
      {view === "flyer" || shared ? (
        <article className="mx-auto grid w-full max-w-2xl gap-6 rounded-card border border-border bg-surface p-10 text-center print:border-0 print:p-0">
          {studio.logoUrl && <img src={studio.logoUrl} alt="" className="mx-auto h-16 object-contain" />}
          <p className="text-sm tracking-widest text-muted uppercase">{studio.name}</p>
          <h1 className="text-3xl font-semibold text-balance">
            {t.flyerTitle(job.organizationName, job.name)}
          </h1>
          <p className="text-lg">{t.flyerLead}</p>
          <div className="mx-auto grid gap-2 rounded-card border-2 border-ink px-10 py-6">
            <p className="text-sm text-muted">{t.goTo}</p>
            <p className="text-xl font-semibold">{storeHost}</p>
            {shared && (
              <>
                <p className="mt-2 text-sm text-muted">{t.enterCode}</p>
                <p className="font-mono text-4xl font-bold tracking-[0.2em]">{job.sharedAccessCode}</p>
              </>
            )}
            {!shared && <p className="mt-2 text-sm text-muted">{t.enterChildCode}</p>}
          </div>
          {job.deadline && <p className="text-muted">{t.orderBy(fmt.date(job.deadline, { month: "long", day: "numeric" }))}</p>}
          <p className="text-xs text-muted">{t.optIn}</p>
        </article>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-0">
          {subjects.map((s) => (
            <div key={s.id} className="grid break-inside-avoid gap-2 rounded-card border border-dashed border-ink/40 bg-surface p-5 print:h-[2.5in] print:rounded-none">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{studio.name}</span>
                <span>{job.organizationName}</span>
              </div>
              <p className="text-lg font-semibold">
                {s.firstName} {s.lastName}
              </p>
              <p className="text-sm text-muted">{s.group}</p>
              <div className="mt-auto flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-muted">{t.viewAt(storeHost)}</p>
                  <p className="font-mono text-2xl font-bold tracking-[0.18em]">{s.accessCode}</p>
                </div>
                <p className="text-right text-xs text-muted">{job.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
