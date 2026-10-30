import { Injectable } from "@nestjs/common";
import type { AlbumPhoto, Photo } from "@snapbell/sdk";
import { signedUrl } from "../common/crypto";
import type { PhotoRow } from "../store/repository";

export interface PreviewOptions {
  /** Burn the "PROOF · studio" watermark into the preview. */
  watermark: boolean;
  /** Identity overlay text, e.g. "Viewed by p•••@example.com". */
  overlay: string | null;
}

const PREVIEW_TTL_SEC = 3_600;

/**
 * Builds the only URLs through which images leave the API: signed, expiring
 * links to watermarked previews. There is no route to originals.
 */
@Injectable()
export class MediaService {
  previewUrl(photoId: string, variant: "thumb" | "preview", opts: PreviewOptions): string {
    const params: Record<string, string> = { w: opts.watermark ? "1" : "0" };
    if (opts.overlay) params.o = opts.overlay;
    return signedUrl(`/media/${photoId}/${variant}`, params, PREVIEW_TTL_SEC);
  }

  photo(row: PhotoRow, opts: PreviewOptions): Photo {
    const { sha256: _s, sizeBytes: _b, ...rest } = row;
    return { ...rest, thumbUrl: this.previewUrl(row.id, "thumb", opts), previewUrl: this.previewUrl(row.id, "preview", opts) };
  }

  albumPhoto(row: PhotoRow, opts: PreviewOptions): AlbumPhoto {
    return {
      id: row.id,
      thumbUrl: this.previewUrl(row.id, "thumb", opts),
      previewUrl: this.previewUrl(row.id, "preview", opts),
      width: row.width,
      height: row.height,
      tags: row.tags,
      group: row.group,
    };
  }

  /** Full-resolution download for a paid digital item (7 days). `path` is "/downloads/<order>/<photo>". */
  downloadUrl(path: string): string {
    return signedUrl(path, {}, 7 * 86_400);
  }

  exportUrl(exportId: string): string {
    return signedUrl(`/exports/${exportId}/download`, {}, 86_400);
  }

  resultsUrl(organizationId: string): string {
    return signedUrl(`/results/${organizationId}`, {}, 90 * 86_400);
  }

  unsubscribeUrl(email: string): string {
    return signedUrl("/unsubscribe", { email }, 365 * 86_400);
  }

  uploadUrl(uploadId: string): string {
    return signedUrl(`/uploads/${uploadId}/content`, {}, 24 * 3_600);
  }
}
