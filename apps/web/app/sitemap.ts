import type { MetadataRoute } from "next";
import { getBlogPosts, getHelpArticles } from "@site/lib/cms";
import { env } from "@site/lib/env";
import { LOCALES, localePath } from "@site/lib/i18n";
import { LEGAL_KEYS } from "@site/lib/site";

const STATIC_ROUTES = [
  { path: "/", priority: 1 },
  { path: "/features", priority: 0.9 },
  { path: "/features/check-in", priority: 0.8 },
  { path: "/features/family-store", priority: 0.8 },
  { path: "/features/marketing", priority: 0.8 },
  { path: "/markets", priority: 0.8 },
  { path: "/switch", priority: 0.7 },
  { path: "/demo", priority: 0.7 },
  { path: "/contact", priority: 0.7 },
  { path: "/find-my-photos", priority: 0.6 },
  { path: "/blog", priority: 0.6 },
  { path: "/help", priority: 0.6 },
  { path: "/about", priority: 0.5 },
];

type Entry = MetadataRoute.Sitemap[number];

/** Every page in every language, each entry listing its hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl.replace(/\/$/, "");
  const url = (locale: (typeof LOCALES)[number], path: string) => `${base}${localePath(locale, path)}`;
  const inAllLocales = (path: string, rest: Omit<Entry, "url" | "alternates">): Entry[] =>
    LOCALES.map((locale) => ({
      url: url(locale, path),
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, url(l, path)])) },
      ...rest,
    }));

  const [posts, articles] = await Promise.all([getBlogPosts("en"), getHelpArticles("en")]);
  return [
    ...STATIC_ROUTES.flatMap((r) => inAllLocales(r.path, { changeFrequency: "weekly", priority: r.priority })),
    ...LEGAL_KEYS.flatMap((key) => inAllLocales(`/${key}`, { changeFrequency: "yearly", priority: 0.2 })),
    ...posts.flatMap((p) => inAllLocales(`/blog/${p.slug}`, { lastModified: p.publishedAt, changeFrequency: "monthly", priority: 0.5 })),
    ...articles.flatMap((a) => inAllLocales(`/help/${a.slug}`, { lastModified: a.updatedAt, changeFrequency: "monthly", priority: 0.4 })),
  ];
}
