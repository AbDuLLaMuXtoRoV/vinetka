import { formatters, isLocale } from "@snapbell/sdk";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prose } from "@site/components/prose";
import { getHelpArticle, getHelpArticles, getHelpCategories } from "@site/lib/cms";
import { getLocale, localePath, pageMetadata } from "@site/lib/i18n";
import { COMPANY } from "@site/lib/site";
import { contentMsgs } from "@site/messages/content";

export const dynamicParams = false;

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const locale = isLocale(params.locale) ? params.locale : "en";
  return (await getHelpArticles(locale)).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/help/[slug]">): Promise<Metadata> {
  const locale = await getLocale(params);
  const { slug } = await params;
  const article = await getHelpArticle(locale, slug);
  if (!article) return {};
  return pageMetadata(locale, `/help/${article.slug}`, {
    title: contentMsgs[locale].help.articleTitle(article.title),
    ogTitle: article.title,
    description: article.summary,
  });
}

export default async function HelpArticlePage({ params }: PageProps<"/[locale]/help/[slug]">) {
  const locale = await getLocale(params);
  const { slug } = await params;
  const article = await getHelpArticle(locale, slug);
  if (!article) notFound();
  const t = contentMsgs[locale].help;
  const category = getHelpCategories(locale).find((c) => c.id === article.category);
  const siblings = (await getHelpArticles(locale)).filter((a) => a.category === article.category && a.slug !== article.slug);

  return (
    <div className="px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto grid max-w-content gap-12 lg:grid-cols-[1fr_18rem]">
        <article className="grid max-w-2xl content-start gap-6">
          <nav aria-label={t.breadcrumb} className="flex items-center gap-2 text-sm text-muted">
            <Link href={localePath(locale, "/help")} className="inline-flex min-h-11 items-center gap-1 hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden /> {t.helpCenter}
            </Link>
            <span aria-hidden>/</span>
            <Link href={localePath(locale, `/help#${article.category}`)} className="hover:text-ink">
              {category?.label}
            </Link>
          </nav>
          <h1 className="font-display text-2xl text-balance md:text-3xl">{article.title}</h1>
          <p className="text-sm text-muted">
            {t.updated} <time dateTime={article.updatedAt}>{formatters(locale).date(article.updatedAt)}</time>
          </p>
          <Prose blocks={article.body} />
          <div className="rounded-card bg-sunken p-5 text-sm">
            <p className="font-semibold">{t.stillNeed}</p>
            <p className="text-muted">
              {t.email[0]}
              <a href={`mailto:${COMPANY.supportEmail}`} className="font-medium text-ink underline underline-offset-4">
                {COMPANY.supportEmail}
              </a>
              {t.email[1]}
            </p>
          </div>
        </article>
        {siblings.length > 0 && (
          <aside aria-labelledby="more-heading" className="grid content-start gap-3">
            <h2 id="more-heading" className="text-sm font-semibold">
              {t.moreIn(category?.label ?? "")}
            </h2>
            <ul className="grid gap-2">
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link href={localePath(locale, `/help/${s.slug}`)} className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink">
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
