import type { CSSProperties } from "react";

const DARK_INK = "#1c1b1f";
const LIGHT_INK = "#ffffff";

function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return 1;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever reads better on the given background. */
export function readableInk(background: string): string {
  return contrastRatio(background, DARK_INK) >= contrastRatio(background, LIGHT_INK) ? DARK_INK : LIGHT_INK;
}

/**
 * Studio branding for the Family Store: overrides the accent token (and the ink
 * drawn on top of it) for everything inside the element this style is applied to.
 */
export function brandStyle(color: string | null | undefined): CSSProperties {
  if (!color || luminance(color) === null) return {};
  return { "--sb-accent": color, "--sb-accent-ink": readableInk(color) } as CSSProperties;
}
