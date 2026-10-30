import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { processImage, VARIANT_SIZES } from "./pipeline.js";

/** 1200×900 JPEG stored sideways (EXIF orientation 6) with identifying EXIF tags. */
async function sidewaysJpegWithExif(): Promise<Buffer> {
  const gradient = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
      <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#2f6f73"/><stop offset="1" stop-color="#f5b700"/></linearGradient></defs>
      <rect width="1200" height="900" fill="url(#g)"/><circle cx="600" cy="450" r="200" fill="#ffffff"/>
    </svg>`,
  );
  return sharp(gradient)
    .jpeg({ quality: 90 })
    .withExif({ IFD0: { Copyright: "Brightside Photo Co.", Artist: "Sam Okafor", Make: "TestCam" } })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

describe("image pipeline", () => {
  it("produces upright, metadata-free AVIF and WebP thumbs and previews", async () => {
    const input = await sidewaysJpegWithExif();
    const inputMeta = await sharp(input).metadata();
    assert.equal(inputMeta.orientation, 6);
    assert.ok(inputMeta.exif, "fixture carries EXIF");

    const out = await processImage(input, { watermark: "PROOF · Brightside Photo Co." });
    // Orientation 6 means the upright image is portrait.
    assert.deepEqual([out.width, out.height], [900, 1200]);
    assert.equal(out.derivatives.length, 4);

    for (const d of out.derivatives) {
      const meta = await sharp(d.data).metadata();
      assert.equal(meta.format, d.format === "avif" ? "heif" : "webp");
      assert.equal(meta.exif, undefined, `${d.variant}.${d.format} must not carry EXIF`);
      assert.ok(!meta.orientation || meta.orientation === 1, "pixels are already upright");
      assert.equal(meta.width, d.width);
      assert.equal(meta.height, d.height);
      assert.ok(d.height > d.width, "portrait after auto-orient");
      const longEdge = Math.max(d.width, d.height);
      assert.ok(longEdge <= VARIANT_SIZES[d.variant]);
    }

    const thumb = out.derivatives.find((d) => d.variant === "thumb" && d.format === "webp")!;
    assert.deepEqual([thumb.width, thumb.height], [300, 400]);
    const preview = out.derivatives.find((d) => d.variant === "preview" && d.format === "webp")!;
    assert.deepEqual([preview.width, preview.height], [900, 1200], "never upscales past the original");
  });

  it("burns the watermark into the pixels", async () => {
    const input = await sidewaysJpegWithExif();
    const marked = await processImage(input, { watermark: "PROOF · Brightside Photo Co." });
    const clean = await processImage(input, { watermark: null });
    const pick = (p: typeof marked) => p.derivatives.find((d) => d.variant === "preview" && d.format === "webp")!.data;
    const [a, b] = await Promise.all([sharp(pick(marked)).raw().toBuffer(), sharp(pick(clean)).raw().toBuffer()]);
    assert.equal(a.length, b.length);
    let changed = 0;
    for (let i = 0; i < a.length; i += 3) if (Math.abs(a[i]! - b[i]!) > 12) changed++;
    assert.ok(changed / (a.length / 3) > 0.02, `watermark should alter visible pixels (changed ${changed})`);
  });
});
