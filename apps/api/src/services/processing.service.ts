import { Injectable, Logger } from "@nestjs/common";
import { hashString, type Match } from "@snapbell/sdk";
import { config } from "../config";
import { newId } from "../common/crypto";
import { later } from "../common/util";
import { Repository, type PhotoRow } from "../store/repository";
import { QueueService } from "./queue.service";

/** Confidence at or above which a match goes live without review. */
export const AUTO_MATCH_THRESHOLD = 0.9;

/**
 * After an upload completes: watermark/derivatives (apps/worker `images` queue)
 * and face matching (`matching` queue). While the API runs on the in-memory store
 * the worker can't write results back, so processing is also simulated here:
 * the photo becomes ready after a short delay and a deterministic mock matcher
 * auto-matches most photos, sends some to review and leaves some unmatched.
 */
@Injectable()
export class ProcessingService {
  private readonly logger = new Logger("Processing");

  constructor(
    private readonly repo: Repository,
    private readonly queue: QueueService,
  ) {}

  start(photo: PhotoRow): void {
    photo.status = "processing";
    const job = this.repo.jobs.get(photo.jobId);
    const studio = job ? this.repo.studios.get(job.studioId) : undefined;
    void this.queue.enqueue("images", {
      photoId: photo.id,
      jobId: photo.jobId,
      filename: photo.filename,
      sha256: photo.sha256,
      watermark: `PROOF · ${studio?.name ?? "Snapbell"}`,
    });
    later(config.processingDelayMs, () => this.finish(photo.id));
  }

  private finish(photoId: string): void {
    const photo = this.repo.photos.get(photoId);
    if (!photo || photo.status !== "processing") return;
    photo.status = "ready";
    if (photo.duplicateOfId) return;
    void this.queue.enqueue("matching", { photoId: photo.id, jobId: photo.jobId, threshold: AUTO_MATCH_THRESHOLD });
    this.mockMatch(photo);
  }

  private mockMatch(photo: PhotoRow): void {
    const subjects = this.repo.subjects.filter((s) => s.jobId === photo.jobId);
    if (subjects.length === 0) return;
    const h = hashString(`${photo.id}:${photo.filename}`);
    const bucket = h % 100;
    if (bucket >= 80) return; // left unmatched
    const subject = subjects[h % subjects.length]!;
    const confidence = bucket < 60 ? 0.92 + (h % 7) / 100 : 0.6 + (h % 20) / 100;
    const match: Match = {
      id: newId("m"),
      jobId: photo.jobId,
      photoId: photo.id,
      subjectId: subject.id,
      confidence: Math.round(confidence * 1000) / 1000,
      status: confidence >= AUTO_MATCH_THRESHOLD ? "auto" : "review",
    };
    this.repo.matches.insert(match);
    if (match.status === "auto") photo.subjectIds = [...new Set([...photo.subjectIds, subject.id])];
    this.logger.debug(`Matched ${photo.id} → ${subject.id} (${match.confidence}, ${match.status})`);
  }
}
