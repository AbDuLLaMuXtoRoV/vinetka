import { Injectable } from "@nestjs/common";
import { hashString, normalizeCode, type Album, type Job, type Studio, type StudioBranding, type Subject } from "@snapbell/sdk";
import { newId } from "../common/crypto";
import { ApiError, badRequest } from "../common/errors";
import { maskDestination, nowIso, sum, unique } from "../common/util";
import { Repository, type ParentRow, type PhotoRow } from "../store/repository";
import { MediaService, type PreviewOptions } from "./media.service";
import { currentLocale, err, fmt, labels } from "../i18n";

export interface ResolvedAlbum {
  code: string;
  job: Job;
  studio: Studio;
  /** The child for Personal albums; null for Team/Open shared codes. */
  subject: Subject | null;
}

export function branding(studio: Studio): StudioBranding {
  return { name: studio.name, logoUrl: studio.logoUrl, brandColor: studio.brandColor };
}

/** Code → album resolution and the parent-facing album read model. */
@Injectable()
export class AlbumsService {
  constructor(
    private readonly repo: Repository,
    private readonly media: MediaService,
  ) {}

  /** 404 invalid_code when nothing matches. Does not check publish state. */
  resolve(input: string): ResolvedAlbum {
    const code = normalizeCode(input);
    const invalid = () =>
      new ApiError(404, "invalid_code", err().album.invalidCode, { studio: null, publishAt: null });
    if (code.length < 4 || code.length > 12) throw invalid();

    const shared = this.repo.jobs.find((j) => j.sharedAccessCode === code && j.albumType !== "personal");
    if (shared) return { code, job: shared, studio: this.studioOf(shared), subject: null };

    const subject = this.repo.subjects.find((s) => s.accessCode === code);
    const job = subject ? this.repo.jobs.get(subject.jobId) : undefined;
    if (!subject || !job || job.albumType !== "personal") throw invalid();
    return { code, job, studio: this.studioOf(job), subject };
  }

  private studioOf(job: Job): Studio {
    return this.repo.studios.get(job.studioId)!;
  }

  /** 409 not_published (with the date) or 410 expired. */
  assertOpen(r: ResolvedAlbum, now = new Date()): void {
    const { job } = r;
    if (job.status === "draft" || (job.publishAt && new Date(job.publishAt) > now)) {
      throw new ApiError(409, "not_published", job.publishAt ? err().album.notPublished(job.name, fmt().date(job.publishAt, { month: "long", day: "numeric", year: "numeric" })) : err().album.notPublishedNoDate(job.name), {
        studio: branding(r.studio),
        publishAt: job.publishAt,
      });
    }
    if (job.status === "closed" || (job.expiresAt && new Date(job.expiresAt) < now)) {
      throw new ApiError(410, "expired", err().album.expired(r.studio.name), {
        studio: branding(r.studio),
        publishAt: job.publishAt,
      });
    }
  }

  /** Records that the parent opened this album (Personal codes unlock the child for their account). */
  unlock(r: ResolvedAlbum, parent: ParentRow): void {
    const accessId = `${parent.id}:${r.job.id}`;
    if (!this.repo.albumAccess.get(accessId)) {
      this.repo.albumAccess.insert({ id: accessId, parentId: parent.id, jobId: r.job.id, albumCode: r.code, firstSeenAt: nowIso() });
    }
    if (r.subject) {
      const id = `${parent.id}:${r.subject.id}`;
      if (!this.repo.parentSubjects.get(id)) {
        this.repo.parentSubjects.insert({ id, parentId: parent.id, subjectId: r.subject.id, albumCode: r.code, unlockedAt: nowIso() });
      }
    }
  }

  hasAccess(r: ResolvedAlbum, parent: ParentRow): boolean {
    if (r.subject) return !!this.repo.parentSubjects.get(`${parent.id}:${r.subject.id}`);
    return !!this.repo.albumAccess.get(`${parent.id}:${r.job.id}`) || this.repo.parentSubjects.filter((ps) => ps.parentId === parent.id).some((ps) => this.repo.subjects.get(ps.subjectId)?.jobId === r.job.id);
  }

  /** Subject a Team/Open album has been personalised to (via an earlier unlock), if any. */
  private personalSubject(r: ResolvedAlbum, parent: ParentRow | null): Subject | null {
    if (r.subject) return r.subject;
    if (!parent) return null;
    const link = this.repo.parentSubjects.find((ps) => ps.parentId === parent.id && this.repo.subjects.get(ps.subjectId)?.jobId === r.job.id);
    return link ? (this.repo.subjects.get(link.subjectId) ?? null) : null;
  }

  /**
   * Photos the parent may see. Personal: only photos linked to the child by an
   * auto/accepted match (review-only matches never appear) plus their group photos.
   * Team/Open: every ready photo, with the parent's Find Me additions first.
   */
  visiblePhotos(r: ResolvedAlbum, parent: ParentRow | null): PhotoRow[] {
    const ready = this.repo.photos
      .filter((p) => p.jobId === r.job.id && p.status === "ready" && !p.duplicateOfId)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (r.subject) {
      const subjectId = r.subject.id;
      return ready.filter((p) => p.subjectIds.includes(subjectId)).sort((a, b) => Number(!!a.group) - Number(!!b.group));
    }
    const added = parent ? (this.repo.albumAdditions.get(`${parent.id}:${r.code}`)?.photoIds ?? []) : [];
    const first = ready.filter((p) => added.includes(p.id));
    return [...first, ...ready.filter((p) => !added.includes(p.id))];
  }

  previewOptions(r: ResolvedAlbum, parent: ParentRow | null, preview = false): PreviewOptions {
    const p = r.job.protection;
    const who = parent ? maskDestination(parent.email ?? parent.phone) : null;
    return {
      watermark: p.watermark,
      overlay: p.identityOverlay ? (preview ? labels().overlay.studioPreview : who ? labels().overlay.viewedBy(who) : null) : null,
    };
  }

  findMeEnabled(r: ResolvedAlbum): boolean {
    if (r.job.albumType === "personal") return false;
    const flag = this.repo.flags.get("find_me_selfie_search");
    return !!flag?.enabled && (flag.studioIds.length === 0 || flag.studioIds.includes(r.studio.id));
  }

  passCredit(parent: ParentRow | null, jobIds: string[]): number {
    if (!parent) return 0;
    return sum(
      this.repo.passes.filter((p) => p.parentId === parent.id && jobIds.includes(p.jobId) && p.remainingCents > 0),
      (p) => p.remainingCents,
    );
  }

  build(r: ResolvedAlbum, parent: ParentRow | null, opts: { preview?: boolean } = {}): Album {
    const photos = this.visiblePhotos(r, parent);
    const options = this.previewOptions(r, parent, opts.preview);
    const subject = this.personalSubject(r, parent);
    const favorites = parent ? (this.repo.favorites.get(`${parent.id}:${r.code}`)?.photoIds ?? []) : [];
    const visible = new Set(photos.map((p) => p.id));
    return {
      code: r.code,
      studio: branding(r.studio),
      job: {
        id: r.job.id,
        name: r.job.name,
        organizationName: this.repo.organizations.get(r.job.organizationId)?.name ?? r.job.organizationName,
        date: r.job.date,
        albumType: r.job.albumType,
        deadline: r.job.deadline,
        protection: r.job.protection,
        shipping: r.job.shipping,
        downloads: r.job.downloads,
      },
      subject: subject ? { id: subject.id, firstName: subject.firstName, lastName: subject.lastName, group: subject.group } : null,
      state: photos.length === 0 ? "matching" : "live",
      photos: photos.map((p) => this.media.albumPhoto(p, options)),
      filters: {
        tags: unique(photos.flatMap((p) => p.tags)),
        groups: unique(photos.map((p) => p.group).filter((g): g is string => !!g)),
      },
      favorites: favorites.filter((id) => visible.has(id)),
      passCreditCents: this.passCredit(parent, [r.job.id]),
      findMeAvailable: this.findMeEnabled(r),
    };
  }

  /** Mock face search: deterministic per selfie, returns one subject's photos (or a sample). The image is never stored. */
  findMe(r: ResolvedAlbum, parent: ParentRow, imageBase64: string): PhotoRow[] {
    if (!this.findMeEnabled(r)) throw badRequest("find_me_unavailable", err().album.findMeUnavailable);
    const bytes = imageBase64.replace(/^data:[^;]+;base64,/, "");
    if (bytes.length < 100) throw badRequest("invalid_image", err().album.invalidImage);
    parent.consent = { ...parent.consent, biometricsAt: nowIso() };
    const ready = this.visiblePhotos(r, parent);
    const subjects = this.repo.subjects.filter((s) => s.jobId === r.job.id);
    const seed = hashString(bytes.slice(0, 4096));
    if (subjects.length > 0) {
      const subject = subjects[seed % subjects.length]!;
      const hits = ready.filter((p) => p.subjectIds.includes(subject.id) && !p.group);
      if (hits.length > 0) return hits;
    }
    return ready.filter((_, i) => (i + seed) % 5 === 0).slice(0, 8);
  }

  savePhotoSet(table: "favorites" | "albumAdditions", r: ResolvedAlbum, parent: ParentRow, photoIds: string[], merge: boolean): string[] {
    const visible = new Set(this.visiblePhotos(r, parent).map((p) => p.id));
    const invalid = photoIds.filter((id) => !visible.has(id));
    if (invalid.length) throw badRequest("invalid_photo", err().album.photosNotInAlbum, { photoIds: invalid });
    const id = `${parent.id}:${r.code}`;
    const existing = this.repo[table].get(id);
    const next = unique(merge && existing ? [...existing.photoIds, ...photoIds] : photoIds);
    this.repo[table].insert({ id, parentId: parent.id, albumCode: r.code, photoIds: next });
    return next;
  }

  notify(r: ResolvedAlbum, destination: string): void {
    this.repo.notifyRequests.insert({ id: newId("ntf"), albumCode: r.code, destination: destination.trim(), locale: currentLocale(), createdAt: nowIso() });
  }
}
