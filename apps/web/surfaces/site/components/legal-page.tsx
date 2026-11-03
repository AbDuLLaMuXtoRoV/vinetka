import { formatters, type Locale } from "@snapbell/sdk";
import { Alert } from "@snapbell/ui/feedback";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getLegalDoc, type LegalKey } from "@site/lib/cms";
import { getLocale, pageMetadata } from "@site/lib/i18n";
import { legalLinks } from "@site/lib/site";
import { contentMsgs } from "@site/messages/content";

/** generateMetadata for a legal page: `export const generateMetadata = legalMetadata("terms")`. */
export function legalMetadata(key: LegalKey) {
  return async ({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> => {
    const locale = await getLocale(params);
    const doc = await getLegalDoc(locale, key);
    return pageMetadata(locale, `/${key}`, { title: doc.title, description: doc.description });
  };
}

/** One template for every legal page: title, last-updated date, draft notice, sections, sibling links. */
export async function LegalPage({ locale, docKey, children }: { locale: Locale; docKey: LegalKey; children?: ReactNode }) {
  const doc = await getLegalDoc(locale, docKey);
  const t = contentMsgs[locale].legal;
  return (
    <div className="px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto grid max-w-content gap-12 lg:grid-cols-[14rem_1fr]">
        <nav aria-label={t.navAria} className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:grid lg:gap-1">
            {legalLinks(locale).map((l) => {
              const current = l.key === docKey;
              return (
                <li key={l.key}>
                  <Link
                    href={l.href}
                    aria-current={current ? "page" : undefined}
                    className={
                      current
                        ? "inline-flex min-h-11 items-center rounded-input bg-ink px-3 text-sm font-medium text-bg"
                        : "inline-flex min-h-11 items-center rounded-input px-3 text-sm text-muted hover:bg-ink/5 hover:text-ink"
                    }
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <article className="grid max-w-3xl content-start gap-8">
          <header className="grid gap-3">
            <h1 className="font-display text-3xl text-balance">{doc.title}</h1>
            <p className="text-sm text-muted">
              {t.lastUpdated} <time dateTime={doc.updatedAt}>{formatters(locale).date(doc.updatedAt, { month: "long", day: "numeric", year: "numeric" })}</time>
            </p>
            <Alert tone="warning" title={t.draftTitle}>
              {t.draftBody}
            </Alert>
          </header>
          <p className="text-lg">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.heading} className="grid gap-3">
              <h2 className="text-xl font-semibold">{s.heading}</h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="leading-relaxed text-muted">
                  {p}
                </p>
              ))}
            </section>
          ))}
          {children}
        </article>
      </div>
    </div>
  );
}
