import sharp from "sharp";

export type Variant = "thumb" | "preview";
export type OutputFormat = "avif" | "webp";

/** Long-edge sizes for each derivative. */
export const VARIANT_SIZES: Record<Variant, number> = { thumb: 400, preview: 1600 };
const FORMATS: OutputFormat[] = ["avif", "webp"];

export interface Derivative {
  variant: Variant;
  format: OutputFormat;
  width: number;
  height: number;
  data: Buffer;
}

export interface ProcessedImage {
  /** Upright dimensions of the original after EXIF orientation. */
  width: number;
  height: number;
  derivatives: Derivative[];
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c);
}

/**
 * Full-size SVG overlay: the watermark text repeated diagonally across the image,
 * semi-transparent white with a dark outline so it reads on light and dark photos.
 */
export function watermarkSvg(width: number, height: number, text: string): Buffer {
  const fontSize = Math.max(12, Math.round(Math.min(width, height) / 14));
  const tileW = Math.round(fontSize * Math.max(8, text.length * 0.62));
  const tileH = Math.round(fontSize * 4);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<defs><pattern id="wm" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
<text x="0" y="${Math.round(tileH / 2)}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700"
 fill="#ffffff" fill-opacity="0.38" stroke="#000000" stroke-opacity="0.18" stroke-width="${Math.max(1, Math.round(fontSize / 24))}">${escapeXml(text)}</text>
</pattern></defs>
<rect width="100%" height="100%" fill="url(#wm)"/>
</svg>`,
  );
}

/**
 * Original → upright, metadata-stripped, watermarked thumb + preview in AVIF and WebP.
 * Originals are only read here; nothing derived from them is served unwatermarked
 * except paid downloads, which are produced separately at fulfilment.
 */
export async function processImage(input: Buffer | string, opts: { watermark: string | null }): Promise<ProcessedImage> {
  // rotate() with no angle applies EXIF orientation; sharp drops EXIF/XMP/IPTC on output unless asked to keep it.
  const upright = await sharp(input, { failOn: "error" }).rotate().toBuffer({ resolveWithObject: true });
  const derivatives: Derivative[] = [];

  for (const variant of Object.keys(VARIANT_SIZES) as Variant[]) {
    const size = VARIANT_SIZES[variant];
    const resized = await sharp(upright.data)
      .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true });
    const { width, height } = resized.info;
    let base = sharp(resized.data);
    if (opts.watermark) base = base.composite([{ input: watermarkSvg(width, height, opts.watermark), blend: "over" }]);
    const flattened = await base.toBuffer();

    for (const format of FORMATS) {
      const encoder = sharp(flattened);
      const data = format === "avif" ? await encoder.avif({ quality: 55, effort: 4 }).toBuffer() : await encoder.webp({ quality: 78 }).toBuffer();
      derivatives.push({ variant, format, width, height, data });
    }
  }

  return { width: upright.info.width, height: upright.info.height, derivatives };
}
