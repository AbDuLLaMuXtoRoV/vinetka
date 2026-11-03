import type { PlaceholderOptions } from "@snapbell/sdk";

/**
 * Illustrative "photos" for the marketing site (no real children's photos on
 * the public site). Rendered by the /ph.svg route and cached by the CDN, so
 * pages stay small and images lazy-load.
 */
export function photoUri(options: PlaceholderOptions): string {
  const params = new URLSearchParams({ s: options.seed });
  if (options.kind && options.kind !== "portrait") params.set("k", options.kind);
  if (options.watermark) params.set("w", options.watermark);
  if (options.overlay) params.set("o", options.overlay);
  return `/ph.svg?${params.toString()}`;
}

export const PROOF_WATERMARK = "PROOF · Brightside Photo Co.";
