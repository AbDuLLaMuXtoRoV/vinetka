"use client";

import { Tabs } from "@snapbell/ui/disclosure";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Tabs whose selection mirrors the URL hash, so ads can deep-link to
 * /markets#sports and the tab is selected on load and on hashchange.
 */
export function HashTabs({ values, defaultValue, className, children }: { values: string[]; defaultValue: string; className?: string; children: ReactNode }) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const sync = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (values.includes(hash)) setValue(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [values]);

  const onValueChange = (next: string) => {
    setValue(next);
    window.history.replaceState(null, "", `#${next}`);
  };

  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      {children}
    </Tabs>
  );
}
