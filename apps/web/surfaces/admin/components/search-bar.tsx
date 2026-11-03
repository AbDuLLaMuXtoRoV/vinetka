import type { Locale } from "@snapbell/sdk";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { adminMsgs } from "@admin/messages/admin";

/** GET form: filters live in the URL so views are linkable from support tickets. */
export function SearchBar({ q, placeholder, locale, children }: { q: string; placeholder: string; locale: Locale; children?: ReactNode }) {
  const t = adminMsgs[locale];
  return (
    <form className="mb-4 flex flex-wrap gap-2" role="search">
      <div className="relative min-w-60 flex-1 md:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input name="q" defaultValue={q} placeholder={placeholder} aria-label={t.search} className="h-10 w-full rounded-input border border-border bg-surface pr-3 pl-9 text-sm" />
      </div>
      {children}
      <button type="submit" className="h-10 rounded-input bg-ink px-4 text-sm font-medium text-bg">
        {t.filter}
      </button>
    </form>
  );
}

export function FilterSelect({ name, value, label, options, locale }: { name: string; value: string; label: string; options: Array<[string, string]>; locale: Locale }) {
  return (
    <select name={name} defaultValue={value} aria-label={label} className="h-10 rounded-input border border-border bg-surface px-3 text-sm">
      <option value="">{adminMsgs[locale].filterAll(label)}</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
