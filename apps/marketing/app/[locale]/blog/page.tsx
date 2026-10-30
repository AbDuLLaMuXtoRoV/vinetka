import { formatters, type Locale } from "@snapbell/sdk";
import { Badge } from "@snapbell/ui/badge";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, Section } from "@/components/section";
import { blogCategoryIds, getBlogCategories, getBlogPosts, readingTimeMinutes, type BlogPost } from "@/lib/cms";
import { getLocale, localePath, pageMetadata } from "@/lib/i18n";
import { contentMsgs } from "@/messages/content";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const locale = await getLocale(params);
  return pageMetadata(locale, "/blog", contentMsgs[locale].blog.meta);
}

function PostCard({ post, featured, locale }: { post: BlogPost; featured?: boolean; locale: Locale }) {
  const t = contentMsgs[locale].blog;
  return (
    <article className="relative grid content-start gap-3 rounded-card border border-border bg-surface p-6 transition-shadow duration-150 hover:shadow-hover">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Badge tone="sage">{getBlogCategories(locale)[post.category]}</Badge>
        <span>{t.minRead(readingTimeMinutes(post))}</span>
      </div>
      <h3 className={featured ? "font-display text-2xl text-balance" : "text-lg font-semibold"}>
        <Link href={localePath(locale, `/blog/${post.slug}`)} className="after:absolute after:inset-0 after:content-['']">
          {post.title}
        </Link>
      </h3>
      <p className="text-muted">{post.excerpt}</p>
      <p className="text-sm text-muted">
        {post.author.name} · <time dateTime={post.publishedAt}>{formatters(locale).date(post.publishedAt)}</time>
      </p>
    </article>
  );
}

export default async function BlogPage({ params }: PageProps<"/[locale]/blog">) {
  const locale = await getLocale(params);
  const t = contentMsgs[locale].blog;
  const posts = await getBlogPosts(locale);
  const [featured, ...rest] = posts;
  const labels = getBlogCategories(locale);
  const categories = blogCategoryIds();

  return (
    <>
      <PageHero eyebrow={t.hero.eyebrow} title={t.hero.title} lead={t.hero.lead}>
        <nav aria-label={t.categoriesAria} className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <a key={c} href={`#${c}`} className="inline-flex min-h-11 items-center rounded-input border border-border bg-surface px-4 text-sm font-medium hover:border-ink/40">
              {labels[c]}
            </a>
          ))}
        </nav>
      </PageHero>

      {featured && (
        <Section className="pt-0 md:pt-0">
          <PostCard post={featured} locale={locale} featured />
        </Section>
      )}

      {categories.map((c) => {
        const inCategory = rest.filter((p) => p.category === c);
        if (inCategory.length === 0) return null;
        return (
          <Section key={c} id={c} className="pt-0 md:pt-0" labelledBy={`cat-${c}`}>
            <h2 id={`cat-${c}`} className="mb-6 text-xl font-semibold">
              {labels[c]}
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {inCategory.map((p) => (
                <PostCard key={p.slug} post={p} locale={locale} />
              ))}
            </div>
          </Section>
        );
      })}
    </>
  );
}
