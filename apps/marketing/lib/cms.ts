/**
 * Content adapter. Every page reads content through these functions so the
 * local `content/*` modules can be swapped for Sanity (or Payload) queries
 * later without touching page code.
 *
 * Every getter takes the locale first. Slugs and keys are the same in every
 * language (the English slugs); dates are ISO strings for the page to format.
 */
import type { Locale, Market } from "@snapbell/sdk";
import { BLOG_CATEGORY_IDS, blogCategoryLabels, blogSources, type Block, type BlogCategory, type BlogPost } from "@/content/blog";
import { HELP_CATEGORY_IDS, helpCategoryCopy, helpSources, type HelpArticle, type HelpCategory, type HelpCategoryInfo } from "@/content/help";
import { legalSources, type LegalDoc, type LegalKey } from "@/content/legal";
import { marketSources, type MarketContent } from "@/content/markets";

export type { Block, BlogCategory, BlogPost, HelpArticle, HelpCategory, HelpCategoryInfo, LegalDoc, LegalKey, MarketContent };

// --- Categories ------------------------------------------------------------------

/** Blog category id → label in this language. */
export function getBlogCategories(locale: Locale): Record<BlogCategory, string> {
  return blogCategoryLabels[locale];
}

/** Help categories in display order, with label and description in this language. */
export function getHelpCategories(locale: Locale): HelpCategoryInfo[] {
  return HELP_CATEGORY_IDS.map((id) => ({ id, ...helpCategoryCopy[locale][id] }));
}

export function blogCategoryIds(): BlogCategory[] {
  return [...BLOG_CATEGORY_IDS];
}

// --- Blog ---------------------------------------------------------------------

function blockText(blocks: Block[]): string {
  return blocks.map((b) => (b.type === "ul" ? b.items.join(" ") : b.text)).join(" ");
}

/** Reading time of an already-localized post or article (about 200 words a minute). */
export function readingTimeMinutes(post: Pick<BlogPost, "body">): number {
  const words = blockText(post.body).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const byNewest = (a: BlogPost, b: BlogPost) => b.publishedAt.localeCompare(a.publishedAt);

function localizePosts(locale: Locale): BlogPost[] {
  return blogSources.map((s) => {
    const copy = s.copy[locale];
    return {
      slug: s.slug,
      category: s.category,
      publishedAt: s.publishedAt,
      author: { name: s.author, role: copy.authorRole },
      title: copy.title,
      excerpt: copy.excerpt,
      body: copy.body,
    };
  });
}

export async function getBlogPosts(locale: Locale): Promise<BlogPost[]> {
  return localizePosts(locale).sort(byNewest);
}

export async function getBlogPost(locale: Locale, slug: string): Promise<BlogPost | null> {
  return localizePosts(locale).find((p) => p.slug === slug) ?? null;
}

/** Same category first, then the newest of the rest. */
export async function getRelatedPosts(locale: Locale, slug: string, limit = 3): Promise<BlogPost[]> {
  const posts = localizePosts(locale);
  const post = posts.find((p) => p.slug === slug);
  const others = posts.filter((p) => p.slug !== slug).sort(byNewest);
  if (!post) return others.slice(0, limit);
  const same = others.filter((p) => p.category === post.category);
  const rest = others.filter((p) => p.category !== post.category);
  return [...same, ...rest].slice(0, limit);
}

// --- Help center -----------------------------------------------------------------

function localizeArticles(locale: Locale): HelpArticle[] {
  return helpSources.map((s) => ({ slug: s.slug, category: s.category, updatedAt: s.updatedAt, ...s.copy[locale] }));
}

export async function getHelpArticles(locale: Locale): Promise<HelpArticle[]> {
  return localizeArticles(locale);
}

export async function getHelpArticle(locale: Locale, slug: string): Promise<HelpArticle | null> {
  return localizeArticles(locale).find((a) => a.slug === slug) ?? null;
}

/** Case-insensitive search over title, summary and body in the given language; every term must match. */
export async function searchHelpArticles(locale: Locale, query: string): Promise<HelpArticle[]> {
  const articles = localizeArticles(locale);
  const lower = (s: string) => s.toLocaleLowerCase(locale);
  const terms = lower(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return articles;
  return articles.filter((a) => {
    const haystack = lower(`${a.title} ${a.summary} ${blockText(a.body)}`);
    return terms.every((t) => haystack.includes(t));
  });
}

// --- Legal ---------------------------------------------------------------------

export async function getLegalDoc(locale: Locale, key: LegalKey): Promise<LegalDoc> {
  const s = legalSources[key];
  return { key, updatedAt: s.updatedAt, ...s.copy[locale] };
}

// --- Markets -------------------------------------------------------------------

/** Market tabs (schools, sports, …) in this language, in display order. */
export function getMarkets(locale: Locale): MarketContent[] {
  return marketSources.map((s) => {
    const c = s.copy[locale];
    return {
      id: s.id,
      label: c.label,
      headline: c.headline,
      summary: c.summary,
      bullets: c.bullets,
      quote: { text: c.quote.text, name: s.quoteName, role: c.quote.role },
      image: { kind: s.image.kind, seed: s.image.seed, alt: c.imageAlt },
      workflow: c.workflow,
      caseStudy: { studio: s.studio, metric: c.caseStudy.metric, metricLabel: c.caseStudy.metricLabel, story: c.caseStudy.story },
    };
  });
}

export function getMarket(locale: Locale, id: Market): MarketContent {
  return getMarkets(locale).find((m) => m.id === id)!;
}
