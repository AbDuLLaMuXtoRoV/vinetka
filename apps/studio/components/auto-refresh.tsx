"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches server components on an interval while the tab is visible (real-time order feed). */
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
