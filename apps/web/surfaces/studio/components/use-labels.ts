import { useLocale } from "@snapbell/ui/locale";
import { useMemo } from "react";
import { getLabels } from "@studio/lib/labels";

/** Translated enum labels for client components. */
export function useLabels() {
  const locale = useLocale();
  return useMemo(() => getLabels(locale), [locale]);
}
