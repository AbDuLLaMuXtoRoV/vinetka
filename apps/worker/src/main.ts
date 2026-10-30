import { Queue, Worker } from "bullmq";
import { config, redisConnection } from "./config.js";
import { createProcessors, type QueueName } from "./processors.js";

async function main(): Promise<void> {
  if (!config.redisUrl) {
    console.log(
      [
        "Snapbell worker: REDIS_URL is not set, so there are no queues to consume.",
        "In local development the API simulates photo processing and matching in-process.",
        "",
        "To run the real pipeline:",
        "  docker compose up -d redis            # or any Redis 6+",
        "  REDIS_URL=redis://localhost:6379 UPLOAD_DIR=.data/uploads pnpm --filter @snapbell/api dev",
        "  REDIS_URL=redis://localhost:6379 UPLOAD_DIR=../api/.data/uploads pnpm --filter @snapbell/worker dev",
        "",
        "Process a single image without Redis:",
        "  pnpm --filter @snapbell/worker process-image <input.jpg> <outDir>",
      ].join("\n"),
    );
    process.exit(0);
  }

  const connection = redisConnection(config.redisUrl);
  const processors = createProcessors();
  const workers = (Object.keys(processors) as QueueName[]).map((name) => {
    const worker = new Worker(name, (job) => processors[name](job.data), {
      connection,
      concurrency: name === "images" ? config.concurrency : Math.max(1, config.concurrency * 2),
    });
    worker.on("failed", (job, err) => console.error(`[${name}] job ${job?.id} failed: ${err.message}`));
    worker.on("completed", (job) => console.log(`[${name}] job ${job.id} done`));
    return worker;
  });

  // Daily biometrics retention sweep at 03:00 UTC.
  const retention = new Queue("retention", { connection });
  await retention.upsertJobScheduler("daily-face-retention", { pattern: "0 3 * * *" }, { name: "retention", data: { jobs: [] } });

  console.log(`Snapbell worker consuming ${workers.length} queues (concurrency ${config.concurrency}).`);

  const shutdown = async () => {
    console.log("Shutting down worker…");
    await Promise.all([...workers.map((w) => w.close()), retention.close()]);
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
