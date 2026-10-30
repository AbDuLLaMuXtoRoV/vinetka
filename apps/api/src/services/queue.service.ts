import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import type { Queue } from "bullmq";
import { config } from "../config";

/** Queue names shared with apps/worker. */
export type QueueName = "images" | "matching" | "labs" | "messages" | "retention";

export function redisConnection(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) : undefined,
    tls: u.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

/**
 * BullMQ producer. Without REDIS_URL nothing is enqueued and callers fall back
 * to in-process simulation, so local development needs no infrastructure.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger("Queue");
  private readonly queues = new Map<QueueName, Queue>();

  get enabled(): boolean {
    return !!config.redisUrl;
  }

  async enqueue(name: QueueName, data: Record<string, unknown>, opts: { delayMs?: number; jobId?: string } = {}): Promise<boolean> {
    if (!config.redisUrl) return false;
    try {
      let queue = this.queues.get(name);
      if (!queue) {
        const { Queue: BullQueue } = await import("bullmq");
        queue = new BullQueue(name, { connection: redisConnection(config.redisUrl) });
        this.queues.set(name, queue);
      }
      await queue.add(name, data, {
        delay: opts.delayMs,
        jobId: opts.jobId,
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to enqueue ${name}: ${(err as Error).message}`);
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}
