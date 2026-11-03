import type { Locale } from "@snapbell/sdk";
import Link from "next/link";
import { COMPANY, footerColumns, legalLinks } from "@site/lib/site";
import { commonMsgs } from "@site/messages/common";
import { AppBadges } from "./app-badges";
import { FooterLanguageSwitcher } from "./locale-hrefs";
import { Logo } from "./logo";
import { NewsletterForm } from "./newsletter-form";

const social = [
  {
    label: "Instagram",
    href: "https://instagram.com/",
    path: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" /></>,
  },
  {
    label: "Facebook",
    href: "https://facebook.com/",
    path: <path d="M14 8h3V4h-3c-2.8 0-4.5 1.9-4.5 4.7V11H7v4h2.5v7h4v-7h3l.5-4h-3.5V9c0-.6.4-1 1-1Z" fill="currentColor" />,
  },
  {
    label: "YouTube",
    href: "https://youtube.com/",
    path: <><rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m10 9 5 3-5 3Z" fill="currentColor" /></>,
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/",
    path: <><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M7.5 10v6.5M7.5 7.5v.01M11 16.5V10m0 3c0-1.7 1-3 2.6-3S16.5 11 16.5 13v3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  },
];

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = commonMsgs[locale].footer;
  return (
    <footer className="border-t border-border bg-sunken">
      <div className="mx-auto grid max-w-content gap-12 px-4 py-14 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div className="grid content-start gap-6">
            <Logo />
            <p className="max-w-sm text-sm text-muted">
              {t.tagline}
            </p>
            <NewsletterForm />
            <AppBadges locale={locale} />
          </div>
          <nav aria-label={t.nav} className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {footerColumns(locale).map((col) => (
              <div key={col.title} className="grid content-start gap-3">
                <h2 className="text-sm font-semibold">{col.title}</h2>
                <ul className="grid gap-1">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      {/* Hash links are plain anchors so /markets picks up the tab from the URL on load and on hashchange. */}
                      {l.href.includes("#") ? (
                        <a href={l.href} className="inline-flex min-h-9 items-center text-sm text-muted hover:text-ink">
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} className="inline-flex min-h-9 items-center text-sm text-muted hover:text-ink">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="grid gap-6 border-t border-border pt-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid gap-3">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {legalLinks(locale).map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-9 items-center text-muted hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              © {new Date().getFullYear()} {COMPANY.legalName} · {COMPANY.address}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <ul className="flex gap-1">
              {social.map((s) => (
                <li key={s.label}>
                  <a href={s.href} rel="noopener noreferrer" target="_blank" className="grid size-11 place-items-center rounded-input text-muted hover:bg-ink/5 hover:text-ink" aria-label={t.social(s.label)}>
                    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                      {s.path}
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
            <FooterLanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
