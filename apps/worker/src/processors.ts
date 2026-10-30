import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { config } from "./config.js";
import { processImage } from "./images/pipeline.js";
import { labAdapter } from "./labs/adapter.js";
import { classify, createMatcher, type Matcher } from "./matching/matcher.js";
import { deliver } from "./messages/deliver.js";
import { purgeFaceData } from "./retention/retention.js";

/**
 * Queue processors. Payloads match what apps/api enqueues. Storage is the local
 * filesystem here (the API's UPLOAD_DIR); production swaps in S3/R2 and writes
 * results through packages/db.
 */
export const payloads = {
  images: z.object({ photoId: z.string(), jobId: z.string(), filename: z.string().optional(), sha256: z.string().nullable().optional(), watermark: z.string().optional() }),
  matching: z.object({ photoId: z.string(), jobId: z.string(), threshold: z.number().min(0).max(1).default(0.9) }),
  labs: z.object({ submissionId: z.string(), orderId: z.string(), labId: z.string(), retry: z.boolean().optional() }),
  messages: z.object({ messageId: z.string(), channel: z.enum(["sms", "email"]), to: z.string(), subject: z.string().nullable(), body: z.string() }),
  retention: z.object({ jobs: z.array(z.object({ jobId: z.string(), date: z.string(), deadline: z.string().nullable() })).default([]) }),
};

export type QueueName = keyof typeof payloads;

const derivativePath = (photoId: string, variant: string, format: string) => join(config.derivativesDir, photoId, `${variant}.${format}`);

export function createProcessors(matcher: Matcher = createMatcher()) {
  return {
    async images(data: unknown) {
      const job = payloads.images.parse(data);
      const original = await readFile(join(config.originalsDir, `${job.photoId}.orig`));
      const result = await processImage(original, { watermark: job.watermark ?? "PROOF" });
      await mkdir(join(config.derivativesDir, job.photoId), { recursive: true });
      await Promise.all(result.derivatives.map((d) => writeFile(derivativePath(job.photoId, d.variant, d.format), d.data)));
      return { photoId: job.photoId, width: result.width, height: result.height, derivatives: result.derivatives.map((d) => `${d.variant}.${d.format}`) };
    },

    async matching(data: unknown) {
      const job = payloads.matching.parse(data);
      // Match on the (watermarked) preview: plenty of resolution for faces, never the original.
      const preview = await readFile(derivativePath(job.photoId, "preview", "webp"));
      const matches = await matcher.match({ collectionId: job.jobId, image: preview });
      return { photoId: job.photoId, matcher: matcher.name, matches: matches.map((m) => ({ ...m, status: classify(m.confidence, job.threshold) })) };
    },

    async labs(data: unknown) {
      const job = payloads.labs.parse(data);
      const result = await labAdapter(job.labId).submit({ submissionId: job.submissionId, orderId: job.orderId, orderNumber: job.orderId, lines: [], shipTo: null });
      return { submissionId: job.submissionId, ...result };
    },

    async messages(data: unknown) {
      return deliver(payloads.messages.parse(data));
    },

    async retention(data: unknown) {
      const job = payloads.retention.parse(data);
      return { purgedJobs: await purgeFaceData(matcher, job.jobs) };
    },
  } satisfies Record<QueueName, (data: unknown) => Promise<unknown>>;
}
