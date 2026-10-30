import { Button } from "@snapbell/ui/button";
import { EmptyState } from "@snapbell/ui/feedback";
import { Input } from "@snapbell/ui/input";
import { Briefcase, CreditCard, Rocket, Search, Store, Users, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section } from "@/components/section";
import { getHelpArticles, getHelpCategories, searchHelpArticles, type HelpCategory } from "@/lib/cms";
import { getLocale, localePath, pageMetadata } from "@/lib/i18n";
import { contentMsgs } from "@/messages/content";

export async function generateMetadata({ params }: PageProps<"/[locale]/help">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/help", contentMsgs[locale].help.meta);
}

const ICONS: Record<HelpCategory, LucideIcon> = {
  "getting-started": Rocket,
  jobs: Briefcase,
  store: Store,
  payments: CreditCard,
  parents: Users,
};

export default async function HelpPage({ params, searchParams }: PageProps<"/[locale]/help">) {
  const locale = await getLocale(params);
  const t = contentMsgs[locale].help;
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const articles = q ? await searchHelpArticles(locale, q) : await getHelpArticles(locale);
  const categories = getHelpCategories(locale);
  const label = (id: HelpCategory) => categories.find((c) => c.id === id)?.label ?? id;
  const helpPath = localePath(locale, "/help");

  return (
    <>
      <PageHero eyebrow={t.hero.eyebrow} title={t.hero.title} lead={t.hero.lead}>
        <form role="search" action={helpPath} className="flex max-w-xl gap-2">
          <label htmlFor="help-q" className="sr-only">
            {t.searchLabel}
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input id="help-q" name="q" type="search" defaultValue={q} placeholder={t.placeholder} className="pl-9" />
          </div>
          <Button type="submit" variant="secondary">
            {t.search}
          </Button>
        </form>
      </PageHero>

      {!q && (
        <Section className="pt-0 md:pt-0" labelledBy="cats-heading">
          <h2 id="cats-heading" className="sr-only">
            {t.categories}
          </h2>
          <ul className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => {
              const Icon = ICONS[c.id];
              return (
                <li key={c.id}>
                  <a href={`#${c.id}`} className="grid h-full content-start gap-3 rounded-card border border-border bg-surface p-5 transition-shadow duration-150 hover:shadow-hover">
                    <Icon className="size-6" aria-hidden />
                    <span className="font-semibold">{c.label}</span>
                    <span className="text-sm text-muted">{c.description}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section className="pt-0 md:pt-0">
        {q ? (
          <div className="grid gap-6">
            <p role="status" className="text-muted">
              {t.results(articles.length, q)}{" "}
              <Link href={helpPath} className="font-medium text-ink underline underline-offset-4">
                {t.clear}
              </Link>
            </p>
            {articles.length === 0 ? (
              <EmptyState
                icon={<Search />}
                title={t.noResults.title}
                description={t.noResults.description}
                action={
                  <Button asChild variant="outline">
                    <Link href={localePath(locale, "/about#contact")}>{t.noResults.action}</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="grid gap-3">
                {articles.map((a) => (
                  <li key={a.slug}>
                    <Link href={localePath(locale, `/help/${a.slug}`)} className="grid gap-1 rounded-card border border-border bg-surface p-5 hover:shadow-hover">
                      <span className="text-xs text-muted">{label(a.category)}</span>
                      <span className="font-semibold">{a.title}</span>
                      <span className="text-sm text-muted">{a.summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="grid gap-12">
            {categories.map((c) => (
              <div key={c.id} id={c.id} className="scroll-mt-24">
                <h2 className="mb-4 text-xl font-semibold">{c.label}</h2>
                <ul className="grid gap-3 md:grid-cols-2">
                  {articles
                    .filter((a) => a.category === c.id)
                    .map((a) => (
                      <li key={a.slug}>
                        <Link href={localePath(locale, `/help/${a.slug}`)} className="grid h-full gap-1 rounded-card border border-border bg-surface p-5 hover:shadow-hover">
                          <span className="font-semibold">{a.title}</span>
                          <span className="text-sm text-muted">{a.summary}</span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
