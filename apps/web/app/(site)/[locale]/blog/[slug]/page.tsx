import { formatters, isLocale } from "@snapbell/sdk";
import { Avatar } from "@snapbell/ui/avatar";
import { Badge } from "@snapbell/ui/badge";
import { Button } from "@snapbell/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@site/components/json-ld";
import { Prose } from "@site/components/prose";
import { getBlogCategories, getBlogPost, getBlogPosts, getRelatedPosts, readingTimeMinutes } from "@site/lib/cms";
import { env } from "@site/lib/env";
import { getLocale, htmlLang, localePath, pageMetadata } from "@site/lib/i18n";
import { SITE_NAME } from "@site/lib/site";
import { contentMsgs } from "@site/messages/content";

export const dynamicParams = false;

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const locale = isLocale(params.locale) ? params.locale : "en";
  return (await getBlogPosts(locale)).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const locale = await getLocale(params);
  const { slug } = await params;
  const post = await getBlogPost(locale, slug);
  if (!post) return {};
  return pageMetadata(
    locale,
    `/blog/${post.slug}`,
    { title: post.title, description: post.excerpt, type: "article" },
    { openGraph: { type: "article", publishedTime: post.publishedAt, authors: [post.author.name] } },
  );
}

export default async function BlogPostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const locale = await getLocale(params);
  const { slug } = await params;
  const post = await getBlogPost(locale, slug);
  if (!post) notFound();
  const t = contentMsgs[locale].blog;
  const categories = getBlogCategories(locale);
  const related = await getRelatedPosts(locale, slug);
  const date = formatters(locale).date(post.publishedAt);

  return (
    <article className="px-4 py-12 md:px-6 md:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          inLanguage: htmlLang(locale),
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt,
          author: { "@type": "Person", name: post.author.name, jobTitle: post.author.role },
          publisher: { "@type": "Organization", name: SITE_NAME, url: env.siteUrl },
          mainEntityOfPage: `${env.siteUrl}${localePath(locale, `/blog/${post.slug}`)}`,
        }}
      />
      <div className="mx-auto grid max-w-2xl gap-8">
        <Link href={localePath(locale, "/blog")} className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> {t.allPosts}
        </Link>
        <header className="grid gap-5">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <Badge tone="sage">{categories[post.category]}</Badge>
            <span>{t.minRead(readingTimeMinutes(post))}</span>
          </div>
          <h1 className="font-display text-3xl text-balance">{post.title}</h1>
          <p className="text-xl text-muted">{post.excerpt}</p>
          <div className="flex items-center gap-3">
            <Avatar name={post.author.name} size={44} />
            <div className="text-sm">
              <p className="font-semibold">{post.author.name}</p>
              <p className="text-muted">
                {post.author.role} · <time dateTime={post.publishedAt}>{date}</time>
              </p>
            </div>
          </div>
        </header>
        <Prose blocks={post.body} />
        <aside className="grid gap-4 rounded-card bg-sunken p-6">
          <p className="text-lg font-semibold">{t.tryTitle}</p>
          <p className="text-muted">{t.tryBody}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={localePath(locale, "/contact")}>{t.partner}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={localePath(locale, "/demo")}>{t.demo}</Link>
            </Button>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mx-auto mt-16 max-w-content">
          <h2 id="related-heading" className="mb-6 text-xl font-semibold">
            {t.related}
          </h2>
          <ul className="grid gap-6 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug} className="relative grid content-start gap-2 rounded-card border border-border bg-surface p-5 hover:shadow-hover">
                <span className="text-xs text-muted">{categories[r.category]}</span>
                <Link href={localePath(locale, `/blog/${r.slug}`)} className="font-semibold after:absolute after:inset-0 after:content-['']">
                  {r.title}
                </Link>
                <span className="text-sm text-muted">{t.minRead(readingTimeMinutes(r))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
