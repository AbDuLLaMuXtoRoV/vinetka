import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { processImage } from "../images/pipeline.js";

/**
 * Runs the image pipeline on one file without Redis:
 *   pnpm --filter @snapbell/worker process-image <input> <outDir> [watermark text]
 */
async function main(): Promise<void> {
  const [input, outDir, watermark = "PROOF · Snapbell"] = process.argv.slice(2);
  if (!input || !outDir) {
    console.error("Usage: process-image <input> <outDir> [watermark text]");
    process.exit(1);
  }
  const started = Date.now();
  const result = await processImage(await readFile(input), { watermark });
  await mkdir(outDir, { recursive: true });
  const stem = basename(input, extname(input));
  for (const d of result.derivatives) {
    const file = join(outDir, `${stem}.${d.variant}.${d.format}`);
    await writeFile(file, d.data);
    console.log(`${file}  ${d.width}×${d.height}  ${(d.data.length / 1024).toFixed(1)} KB`);
  }
  console.log(`Original ${result.width}×${result.height}, processed in ${Date.now() - started} ms. Metadata stripped; watermark "${watermark}".`);
}

void main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
