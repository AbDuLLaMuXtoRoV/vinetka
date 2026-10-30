import { err, labels } from "../i18n";
import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import { renderPlaceholderPhoto } from "@snapbell/sdk";
import type { Response } from "express";
import { verifySignedUrl } from "../common/crypto";
import { ApiError, notFound } from "../common/errors";
import { toCsv } from "../common/util";
import { Repository, type PhotoRow } from "../store/repository";
import { MessagingService } from "../services/messaging.service";
import { ViewsService } from "../services/views.service";

/** ASCII fallback plus RFC 5987 UTF-8 name, so names like "Ava — Classic.svg" are valid headers. */
function contentDisposition(name: string): string {
  const ascii = name.normalize("NFKD").replace(/[^\x20-\x7e]/g, "-").replace(/["\\]/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

const forbiddenLink = () => new ApiError(403, "invalid_signature", err().files.invalidLink);

function kindOf(photo: PhotoRow): "portrait" | "group" | "action" {
  if (photo.group || photo.tags.some((t) => t === "Group" || t === "Team")) return "group";
  if (photo.tags.includes("Action")) return "action";
  return "portrait";
}

/**
 * Everything served by signed URL: watermarked previews, paid downloads, export
 * files, read-only results for schools, and email unsubscribe. There is
 * deliberately no route that returns an original upload.
 */
@Controller()
export class FilesController {
  constructor(
    private readonly repo: Repository,
    private readonly views: ViewsService,
    private readonly messaging: MessagingService,
  ) {}

  private sendSvg(res: Response, svg: string, opts: { cache: string; filename?: string }) {
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", opts.cache);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (opts.filename) res.setHeader("Content-Disposition", contentDisposition(opts.filename));
    res.send(svg);
  }

  @Get("media/:photoId/:variant")
  media(@Param("photoId") photoId: string, @Param("variant") variant: string, @Query() q: Record<string, unknown>, @Res() res: Response) {
    if (variant !== "thumb" && variant !== "preview") throw notFound(err().notFound.image);
    const params = verifySignedUrl(`/media/${photoId}/${variant}`, q);
    if (!params) throw forbiddenLink();
    const photo = this.repo.photos.get(photoId);
    if (!photo) throw notFound(err().notFound.image);
    const job = this.repo.jobs.get(photo.jobId);
    const studio = job ? this.repo.studios.get(job.studioId) : undefined;
    const svg = renderPlaceholderPhoto({
      seed: photo.id,
      kind: kindOf(photo),
      watermark: params.w === "1" ? `PROOF · ${studio?.name ?? "Snapbell"}` : null,
      overlay: params.o ?? null,
    });
    this.sendSvg(res, svg, { cache: "private, max-age=3600" });
  }

  @Get("downloads/:orderId/:photoId")
  download(@Param("orderId") orderId: string, @Param("photoId") photoId: string, @Query() q: Record<string, unknown>, @Res() res: Response) {
    const path = `/downloads/${orderId}/${photoId}`;
    if (!verifySignedUrl(path, q)) throw forbiddenLink();
    const order = this.repo.orders.get(orderId);
    const entry = order?.downloads.find((d) => d.url === path);
    const photo = this.repo.photos.get(photoId);
    if (!order || order.paymentState !== "paid" || order.status === "refunded" || !entry || !photo) throw notFound(err().notFound.download);
    // Paid downloads are clean (no watermark, no overlay). Real uploads are served from object storage in production.
    const svg = renderPlaceholderPhoto({ seed: photo.id, kind: kindOf(photo) });
    this.sendSvg(res, svg, { cache: "private, no-store", filename: entry.name.replace(/\.jpg$/, ".svg") });
  }

  @Get("exports/:id/download")
  exportDownload(@Param("id") exportId: string, @Query() q: Record<string, unknown>, @Res() res: Response) {
    if (!verifySignedUrl(`/exports/${exportId}/download`, q)) throw forbiddenLink();
    const exp = this.repo.exports.get(exportId);
    if (!exp || exp.status !== "ready") throw notFound(err().notFound.export);
    const job = this.repo.jobs.get(exp.jobId)!;
    const subjects = this.repo.subjects
      .filter((s) => s.jobId === job.id)
      .sort((a, b) => a.lastName.localeCompare(b.lastName))
      .map((s) => this.views.subject(s));
    const photos = this.repo.photos.filter((p) => p.jobId === job.id && p.status === "ready" && !p.duplicateOfId);
    let rows: Array<Array<string | number | boolean | null>>;
    if (exp.type === "subjects_csv") {
      rows = [
        ["first_name", "last_name", "group", "access_code", "matched_photos", "purchased"],
        ...subjects.map((s) => [s.firstName, s.lastName, s.group, s.accessCode, s.matchedPhotoCount, s.purchased]),
      ];
    } else if (exp.type === "yearbook") {
      rows = [
        ["last_name", "first_name", "group", "photo_id", "filename"],
        ...subjects.map((s) => {
          const mine = photos.filter((p) => !p.group && p.subjectIds.includes(s.id));
          const pick = mine.find((p) => p.labels.includes("Yearbook")) ?? mine[0];
          return [s.lastName, s.firstName, s.group, pick?.id ?? "", pick?.filename ?? ""];
        }),
      ];
    } else {
      const label = exp.label ?? "";
      rows = [
        ["photo_id", "filename", "label", "subjects"],
        ...photos
          .filter((p) => p.labels.includes(label))
          .map((p) => [p.id, p.filename, label, p.subjectIds.map((id) => subjects.find((s) => s.id === id)).filter(Boolean).map((s) => `${s!.firstName} ${s!.lastName}`).join("; ")]),
      ];
    }
    const filename = `${job.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${exp.type}${exp.label ? `-${exp.label.toLowerCase()}` : ""}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", contentDisposition(filename));
    res.setHeader("Cache-Control", "private, no-store");
    res.send(toCsv(rows));
  }

  /** Read-only results link a studio shares with a school or league. */
  @Get("results/:orgId")
  results(@Param("orgId") orgId: string, @Query() q: Record<string, unknown>) {
    if (!verifySignedUrl(`/results/${orgId}`, q)) throw forbiddenLink();
    const org = this.repo.organizations.get(orgId);
    if (!org) throw notFound(err().notFound.organization);
    const studio = this.repo.studios.get(org.studioId);
    return {
      organization: { name: org.name, type: org.type },
      studio: studio?.name ?? null,
      jobs: this.repo.jobs
        .filter((j) => j.organizationId === org.id)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((j) => {
          const stats = this.views.jobStats(j);
          return { name: j.name, date: j.date, status: j.status, subjects: stats.subjects, photos: stats.photos, matchedPct: stats.matchedPct, families: stats.buyers };
        }),
    };
  }

  @Get("unsubscribe")
  unsubscribe(@Query() q: Record<string, unknown>) {
    const params = verifySignedUrl("/unsubscribe", q);
    if (!params?.email) throw forbiddenLink();
    this.messaging.suppress(params.email, "email", "Unsubscribe link");
    return { ok: true, message: labels().unsubscribed };
  }
}
