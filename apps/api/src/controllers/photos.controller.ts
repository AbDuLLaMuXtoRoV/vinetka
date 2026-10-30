import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Req } from "@nestjs/common";
import type { Match, MatchQueue, MatchWithPhoto, Studio, UploadTicket } from "@snapbell/sdk";
import type { Request } from "express";
import { createHash } from "node:crypto";
import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { config } from "../config";
import { newId, verifySignedUrl } from "../common/crypto";
import { ApiError, badRequest, conflict, notFound } from "../common/errors";
import { nowIso, unique } from "../common/util";
import { id, parse } from "../common/validate";
import { Repository, type PhotoRow } from "../store/repository";
import { AuthService } from "../services/auth.service";
import { MediaService } from "../services/media.service";
import { AUTO_MATCH_THRESHOLD, ProcessingService } from "../services/processing.service";
import { ScopeService } from "../services/scope.service";
import { err } from "../i18n";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "image/tiff"];
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const PART_SIZE = 8 * 1024 * 1024;

@Controller()
export class PhotosController {
  constructor(
    private readonly repo: Repository,
    private readonly auth: AuthService,
    private readonly scope: ScopeService,
    private readonly media: MediaService,
    private readonly processing: ProcessingService,
  ) {}

  /** Staff see clean previews (their own work); parents get watermarked ones. Still signed and expiring. */
  private staffPhoto(p: PhotoRow) {
    return this.media.photo(p, { watermark: false, overlay: null });
  }

  @Get("jobs/:id/photos")
  list(@Req() req: Request, @Param("id") jobId: string) {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    return this.repo.photos
      .filter((p) => p.jobId === job.id)
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt) || a.id.localeCompare(b.id))
      .map((p) => this.staffPhoto(p));
  }

  @Post("jobs/:id/uploads")
  presign(@Req() req: Request, @Param("id") jobId: string, @Body() body: unknown): UploadTicket[] {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const { files } = parse(
      z.object({
        files: z
          .array(z.object({ name: z.string().trim().min(1).max(255), size: z.number().int().min(1).max(MAX_FILE_BYTES), type: z.string().max(100) }))
          .min(1)
          .max(500),
      }),
      body,
    );
    const rejected = files.filter((f) => !ACCEPTED_TYPES.includes(f.type.toLowerCase()));
    if (rejected.length) throw badRequest("unsupported_type", err().files.unsupportedType, { files: rejected.map((f) => f.name) });

    return files.map((f) => {
      const uploadId = newId("up");
      const photoId = newId("ph");
      this.repo.photos.insert({
        id: photoId,
        jobId: job.id,
        filename: f.name,
        width: 0,
        height: 0,
        status: "uploading",
        tags: [],
        group: null,
        labels: [],
        subjectIds: [],
        duplicateOfId: null,
        uploadedAt: nowIso(),
        sha256: null,
        sizeBytes: f.size,
      });
      this.repo.uploads.insert({
        id: uploadId,
        jobId: job.id,
        photoId,
        filename: f.name,
        type: f.type,
        size: f.size,
        receivedBytes: 0,
        sha256: null,
        completedAt: null,
        createdAt: nowIso(),
      });
      return { uploadId, filename: f.name, url: this.media.uploadUrl(uploadId), method: "PUT" as const, headers: { "Content-Type": f.type }, partSizeBytes: PART_SIZE };
    });
  }

  /** Dev stand-in for an S3/R2 presigned PUT: authorised by the URL signature, stores only hash + size unless UPLOAD_DIR is set. */
  @Put("uploads/:id/content")
  async receive(@Req() req: Request, @Param("id") uploadId: string, @Query() q: Record<string, unknown>) {
    if (!verifySignedUrl(`/uploads/${uploadId}/content`, q)) throw new ApiError(403, "invalid_signature", err().files.invalidUploadLink);
    const upload = this.repo.uploads.get(uploadId);
    if (!upload || upload.completedAt) throw notFound(err().notFound.upload);
    const hash = createHash("sha256");
    let bytes = 0;
    let file: ReturnType<typeof createWriteStream> | null = null;
    if (config.uploadDir) {
      mkdirSync(config.uploadDir, { recursive: true });
      file = createWriteStream(join(config.uploadDir, `${upload.photoId}.orig`));
    }
    const tooLarge = err().generic.fileTooLarge;
    await new Promise<void>((resolve, reject) => {
      req.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > MAX_FILE_BYTES) {
          reject(new ApiError(413, "payload_too_large", tooLarge));
          req.destroy();
          return;
        }
        hash.update(chunk);
        file?.write(chunk);
      });
      req.on("end", () => resolve());
      req.on("error", reject);
    });
    file?.end();
    upload.receivedBytes = bytes;
    upload.sha256 = hash.digest("hex");
    return { ok: true, bytes, sha256: upload.sha256 };
  }

  @Post("uploads/:id/complete")
  @HttpCode(200)
  complete(@Req() req: Request, @Param("id") uploadId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const upload = this.repo.uploads.get(uploadId);
    if (!upload) throw notFound(err().notFound.upload);
    this.scope.job(studio, upload.jobId);
    const photo = this.repo.photos.get(upload.photoId);
    if (!photo) throw notFound(err().notFound.photo);
    if (upload.completedAt) return this.staffPhoto(photo);
    const dims = parse(z.object({ width: z.number().int().min(1).max(100_000).optional(), height: z.number().int().min(1).max(100_000).optional() }), body);
    upload.completedAt = nowIso();
    photo.width = dims.width ?? 4000;
    photo.height = dims.height ?? 5000;
    photo.sha256 = upload.sha256;
    photo.sizeBytes = upload.receivedBytes || upload.size;
    if (photo.sha256) {
      const original = this.repo.photos.find((p) => p.jobId === photo.jobId && p.id !== photo.id && p.sha256 === photo.sha256 && !p.duplicateOfId);
      if (original) photo.duplicateOfId = original.id;
    }
    this.processing.start(photo);
    return this.staffPhoto(photo);
  }

  @Patch("photos/:id")
  update(@Req() req: Request, @Param("id") photoId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const photo = this.scope.photo(studio, photoId);
    const input = parse(
      z.object({
        tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
        group: z.string().trim().max(100).nullable().optional(),
        labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
      }),
      body,
    );
    if (input.tags) photo.tags = unique(input.tags);
    if (input.labels) photo.labels = unique(input.labels);
    if (input.group !== undefined) photo.group = input.group || null;
    return this.staffPhoto(photo);
  }

  @Delete("photos/:id")
  remove(@Req() req: Request, @Param("id") photoId: string) {
    const { studio } = this.auth.staff(req);
    const photo = this.scope.photo(studio, photoId);
    for (const m of this.repo.matches.filter((x) => x.photoId === photo.id)) this.repo.matches.remove(m.id);
    this.repo.photos.remove(photo.id);
    return { ok: true as const };
  }

  // --- Matching review ----------------------------------------------------------------

  @Get("jobs/:id/matches")
  queue(@Req() req: Request, @Param("id") jobId: string): MatchQueue {
    const { studio } = this.auth.staff(req);
    const job = this.scope.job(studio, jobId);
    const matches = this.repo.matches.filter((m) => m.jobId === job.id);
    const withPhoto = (m: Match): MatchWithPhoto | null => {
      const photo = this.repo.photos.get(m.photoId);
      return photo ? { ...m, photo: this.staffPhoto(photo) } : null;
    };
    const groups = this.repo.subjects
      .filter((s) => s.jobId === job.id)
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
      .map((subject) => {
        const mine = matches.filter((m) => m.subjectId === subject.id);
        const pick = (status: Match["status"]) => mine.filter((m) => m.status === status).map(withPhoto).filter((x): x is MatchWithPhoto => !!x);
        return { subject: { ...subject, matchedPhotoCount: this.repo.photos.filter((p) => !p.group && p.subjectIds.includes(subject.id)).length }, auto: pick("auto"), review: pick("review"), accepted: pick("accepted") };
      })
      // Subjects needing review first.
      .sort((a, b) => b.review.length - a.review.length);
    const live = new Set(matches.filter((m) => m.status !== "rejected").map((m) => m.photoId));
    const unmatched = this.repo.photos
      .filter((p) => p.jobId === job.id && p.status === "ready" && !p.group && !p.duplicateOfId && p.subjectIds.length === 0 && !live.has(p.id))
      .map((p) => this.staffPhoto(p));
    return { jobId: job.id, autoThreshold: AUTO_MATCH_THRESHOLD, groups, unmatched };
  }

  private setStatus(match: Match, status: Match["status"], subjectId = match.subjectId): Match {
    const photo = this.repo.photos.get(match.photoId);
    if (photo) {
      photo.subjectIds = photo.subjectIds.filter((s) => s !== match.subjectId);
      if (status === "accepted" || status === "auto") photo.subjectIds = unique([...photo.subjectIds, subjectId]);
    }
    match.subjectId = subjectId;
    match.status = status;
    return match;
  }

  private sameJobSubject(studio: Studio, subjectId: string, jobId: string) {
    const subject = this.scope.subject(studio, subjectId);
    if (subject.jobId !== jobId) throw badRequest("wrong_job", err().photos.wrongJob);
    return subject;
  }

  @Post("matches/bulk-accept")
  @HttpCode(200)
  bulkAccept(@Req() req: Request, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const { matchIds } = parse(z.object({ matchIds: z.array(id).min(1).max(5_000) }), body);
    let accepted = 0;
    for (const matchId of matchIds) {
      const match = this.scope.match(studio, matchId);
      if (match.status !== "accepted") {
        this.setStatus(match, "accepted");
        accepted++;
      }
    }
    return { accepted };
  }

  @Post("matches/split")
  @HttpCode(200)
  split(@Req() req: Request, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const input = parse(z.object({ matchIds: z.array(id).min(1).max(5_000), subjectId: id }), body);
    let moved = 0;
    for (const matchId of input.matchIds) {
      const match = this.scope.match(studio, matchId);
      this.sameJobSubject(studio, input.subjectId, match.jobId);
      this.setStatus(match, "accepted", input.subjectId);
      moved++;
    }
    return { moved };
  }

  @Post("matches")
  assign(@Req() req: Request, @Body() body: unknown): Match {
    const { studio } = this.auth.staff(req);
    const input = parse(z.object({ photoId: id, subjectId: id }), body);
    const photo = this.scope.photo(studio, input.photoId);
    this.sameJobSubject(studio, input.subjectId, photo.jobId);
    const existing = this.repo.matches.find((m) => m.photoId === photo.id && m.subjectId === input.subjectId);
    if (existing) return this.setStatus(existing, "accepted");
    const match: Match = { id: newId("m"), jobId: photo.jobId, photoId: photo.id, subjectId: input.subjectId, confidence: 1, status: "accepted" };
    this.repo.matches.insert(match);
    return this.setStatus(match, "accepted");
  }

  @Post("matches/:id/accept")
  @HttpCode(200)
  accept(@Req() req: Request, @Param("id") matchId: string) {
    const { studio } = this.auth.staff(req);
    return this.setStatus(this.scope.match(studio, matchId), "accepted");
  }

  @Post("matches/:id/reject")
  @HttpCode(200)
  reject(@Req() req: Request, @Param("id") matchId: string) {
    const { studio } = this.auth.staff(req);
    return this.setStatus(this.scope.match(studio, matchId), "rejected");
  }

  @Post("matches/:id/reassign")
  @HttpCode(200)
  reassign(@Req() req: Request, @Param("id") matchId: string, @Body() body: unknown) {
    const { studio } = this.auth.staff(req);
    const match = this.scope.match(studio, matchId);
    const { subjectId } = parse(z.object({ subjectId: id }), body);
    this.sameJobSubject(studio, subjectId, match.jobId);
    if (this.repo.matches.find((m) => m.id !== match.id && m.photoId === match.photoId && m.subjectId === subjectId)) {
      throw conflict("already_matched", err().photos.alreadyMatched);
    }
    return this.setStatus(match, "accepted", subjectId);
  }
}
