"use client";

import { useEffect } from "react";

/**
 * Wakes the API as soon as a page opens. On free hosting the API sleeps when
 * idle and needs ~30–60 s to start; pinging early means it is usually ready by
 * the time the visitor submits a form. At most once per 5 minutes per tab.
 */
export function ApiWarmup({ url }: { url: string }) {
  useEffect(() => {
    try {
      const last = Number(sessionStorage.getItem("sb_warmup") ?? 0);
      if (Date.now() - last < 5 * 60_000) return;
      sessionStorage.setItem("sb_warmup", String(Date.now()));
    } catch {
      // Storage unavailable (private mode): ping anyway.
    }
    fetch(url, { mode: "no-cors", cache: "no-store", keepalive: true }).catch(() => {});
  }, [url]);
  return null;
}
