import { hashString, mulberry32 } from "./codes";

/**
 * Stand-in "photos" for demo data: a stylised portrait, team or action shot as SVG.
 * The API serves these through the same signed, watermarked preview route that
 * real uploads use, so every protection rule can be exercised without real images.
 */
export interface PlaceholderOptions {
  seed: string;
  kind?: "portrait" | "group" | "action";
  /** Diagonal repeating watermark, e.g. "PROOF · Brightside Photo Co." */
  watermark?: string | null;
  /** Identity overlay along the bottom, e.g. "Viewed by parent@example.com". */
  overlay?: string | null;
}

const BACKDROPS = [
  ["#8fa1b5", "#2c3440"],
  ["#b5a796", "#3f372f"],
  ["#93ad9d", "#2f3d35"],
  ["#a497b8", "#352f40"],
  ["#c9b38f", "#4a3b28"],
  ["#9fb3c8", "#38475a"],
] as const;
const SKIN = ["#f5d6bd", "#f1c7a6", "#e0ac84", "#c68b5e", "#9c6a43", "#6e4a2f"];
const HAIR = ["#2b1d14", "#4a3020", "#7a4e2a", "#c08a4a", "#1c1c1c", "#d9b47a", "#8c3b1f"];
const SHIRT = ["#2f5d8a", "#8a2f45", "#2f7a5d", "#d9a441", "#4a4a6a", "#e8e4dc", "#c2410c", "#6b8f71"];

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)] as T;
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c);
}

function figure(rand: () => number, cx: number, cy: number, scale: number): string {
  const skin = pick(rand, SKIN);
  const hair = pick(rand, HAIR);
  const shirt = pick(rand, SHIRT);
  const tilt = (rand() - 0.5) * 10;
  const s = scale;
  return `<g transform="translate(${cx} ${cy}) rotate(${tilt.toFixed(1)} 0 ${60 * s}) scale(${s})">
  <path d="M-140 260 C-130 150 -50 120 0 120 C50 120 130 150 140 260 Z" fill="${shirt}"/>
  <rect x="-25" y="40" width="50" height="90" rx="22" fill="${skin}" opacity="0.92"/>
  <ellipse cx="0" cy="-15" rx="72" ry="88" fill="${skin}"/>
  <path d="M-72 -10 C-78 -95 -30 -112 0 -112 C42 -112 82 -92 72 -10 C62 -55 36 -76 0 -74 C-38 -74 -64 -52 -72 -10 Z" fill="${hair}"/>
  <ellipse cx="-25" cy="-8" rx="7" ry="8" fill="#231f20"/>
  <ellipse cx="25" cy="-8" rx="7" ry="8" fill="#231f20"/>
  <path d="M-22 32 Q0 ${48 + rand() * 8} 22 32" stroke="#7a3b2e" stroke-width="5" fill="none" stroke-linecap="round"/>
</g>`;
}

export function renderPlaceholderPhoto(options: PlaceholderOptions): string {
  const kind = options.kind ?? "portrait";
  const rand = mulberry32(hashString(options.seed));
  const [light, dark] = pick(rand, BACKDROPS);
  const [w, h] = kind === "portrait" ? [400, 500] : [600, 400];

  let scene: string;
  if (kind === "portrait") {
    scene = figure(rand, 200, 250, 1);
  } else if (kind === "group") {
    const rows: string[] = [`<rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="${dark}" opacity="0.55"/>`];
    for (let row = 0; row < 3; row++) {
      const count = 6 - (row === 0 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const x = (w / (count + 1)) * (i + 1) + (row === 0 ? 0 : (rand() - 0.5) * 8);
        rows.push(figure(rand, x, 110 + row * 95, 0.36));
      }
    }
    scene = rows.join("");
  } else {
    scene = `<rect x="0" y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="#4f7d4a"/>
<rect x="0" y="${h * 0.55}" width="${w}" height="6" fill="#ffffff" opacity="0.5"/>
${figure(rand, w * (0.35 + rand() * 0.3), 170, 0.7)}
<circle cx="${w * (0.2 + rand() * 0.6)}" cy="${h * 0.86}" r="18" fill="#ffffff" stroke="#1c1b1f" stroke-width="3"/>`;
  }

  const watermark = options.watermark
    ? `<defs><pattern id="wm" width="320" height="140" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
<text x="10" y="70" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff" fill-opacity="0.32" letter-spacing="2">${escapeXml(options.watermark)}</text>
</pattern></defs><rect width="${w}" height="${h}" fill="url(#wm)"/>`
    : "";
  const overlay = options.overlay
    ? `<rect x="0" y="${h - 34}" width="${w}" height="34" fill="#000000" fill-opacity="0.45"/>
<text x="${w / 2}" y="${h - 12}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" fill="#ffffff">${escapeXml(options.overlay)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">
<defs><radialGradient id="bg" cx="35%" cy="30%" r="85%"><stop offset="0%" stop-color="${light}"/><stop offset="100%" stop-color="${dark}"/></radialGradient></defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
${scene}
${watermark}
${overlay}
</svg>`;
}
