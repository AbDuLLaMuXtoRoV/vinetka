import type { Locale } from "@snapbell/sdk";
import { Table, TBody, TD, TH, THead, TR } from "@snapbell/ui/data";
import { Check, Minus, X } from "lucide-react";
import type { Metadata } from "next";
import { SwitchForm } from "@site/components/forms/simple-forms";
import { PageHero, Section, SectionHeading } from "@site/components/section";
import { getLocale, pageMetadata } from "@site/lib/i18n";
import { switchMsgs } from "@site/messages/pages";

export async function generateMetadata({ params }: PageProps<"/[locale]/switch">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/switch", switchMsgs[locale].meta);
}

type Cell = "yes" | "no" | "partial";
/** Paper / typical platforms / Snapbell, in the same order as the translated row labels. */
const CELLS: Array<[Cell, Cell, Cell]> = [
  ["no", "partial", "yes"],
  ["no", "partial", "yes"],
  ["no", "partial", "yes"],
  ["no", "partial", "yes"],
  ["partial", "partial", "yes"],
  ["no", "yes", "yes"],
  ["no", "yes", "yes"],
];

function CellIcon({ value, locale }: { value: Cell; locale: Locale }) {
  const t = switchMsgs[locale].cell;
  if (value === "yes")
    return (
      <span className="inline-flex items-center gap-1.5 text-success">
        <Check className="size-4" strokeWidth={3} aria-hidden /> <span className="text-sm text-ink">{t.yes}</span>
      </span>
    );
  if (value === "partial")
    return (
      <span className="inline-flex items-center gap-1.5 text-warning-ink">
        <Minus className="size-4" strokeWidth={3} aria-hidden /> <span className="text-sm text-ink">{t.partial}</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-danger">
      <X className="size-4" strokeWidth={3} aria-hidden /> <span className="text-sm text-ink">{t.no}</span>
    </span>
  );
}

export default async function SwitchPage({ params }: PageProps<"/[locale]/switch">) {
  const locale = await getLocale(params);
  const t = switchMsgs[locale];
  return (
    <>
      <PageHero eyebrow={t.hero.eyebrow} title={t.hero.title} lead={t.hero.lead} />

      <Section className="pt-0 md:pt-0" labelledBy="compare-heading">
        <h2 id="compare-heading" className="mb-6 text-xl font-semibold">
          {t.compareTitle}
        </h2>
        <Table>
          <THead>
            <tr>
              <TH>{t.cols.feature}</TH>
              <TH>{t.cols.paper}</TH>
              <TH>{t.cols.typical}</TH>
              <TH className="bg-accent/20 text-ink">Snapbell</TH>
            </tr>
          </THead>
          <TBody>
            {t.rows.map((r, i) => {
              const [paper, typical, snapbell] = CELLS[i]!;
              return (
                <TR key={r.feature}>
                  <TD className="font-medium">
                    {r.feature}
                    {r.note && <span className="block text-xs font-normal text-muted">{r.note}</span>}
                  </TD>
                  <TD>
                    <CellIcon value={paper} locale={locale} />
                  </TD>
                  <TD>
                    <CellIcon value={typical} locale={locale} />
                  </TD>
                  <TD className="bg-accent/8">
                    <CellIcon value={snapbell} locale={locale} />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        <p className="mt-3 text-xs text-muted">{t.disclaimer}</p>
      </Section>

      <Section tone="sunken" labelledBy="steps-heading">
        <SectionHeading id="steps-heading" eyebrow={t.steps.eyebrow} title={t.steps.title} className="mb-10" />
        <ol className="grid gap-6 md:grid-cols-3">
          {t.steps.items.map((s, i) => (
            <li key={s.title} className="grid content-start gap-3 rounded-card border border-border bg-surface p-6">
              <span className="grid size-10 place-items-center rounded-full bg-ink font-semibold text-bg">{i + 1}</span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="form-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <SectionHeading id="form-heading" eyebrow={t.form.eyebrow} title={t.form.title} lead={t.form.lead} />
          <div className="rounded-card border border-border bg-surface p-6 md:p-8">
            <SwitchForm />
          </div>
        </div>
      </Section>
    </>
  );
}
