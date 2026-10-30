import {
  CreateCollectionCommand,
  DeleteCollectionCommand,
  DetectFacesCommand,
  IndexFacesCommand,
  RekognitionClient,
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
  SearchFacesByImageCommand,
} from "@aws-sdk/client-rekognition";
import { hashString } from "@snapbell/sdk";
import sharp from "sharp";
import { config, rekognitionConfigured } from "../config.js";

export interface FaceMatch {
  subjectId: string;
  /** 0..1 */
  confidence: number;
}

export type MatchStatus = "auto" | "review";

/**
 * Face matching behind one interface: AWS Rekognition for the MVP, a self-hosted
 * embedding model later (pgvector in packages/db). One collection per job; a
 * subject's check-in reference photo is indexed under the subject id.
 */
export interface Matcher {
  readonly name: string;
  indexReference(input: { collectionId: string; subjectId: string; image: Buffer }): Promise<void>;
  match(input: { collectionId: string; image: Buffer }): Promise<FaceMatch[]>;
  /** Removes all face data for a job (retention policy). */
  deleteCollection(collectionId: string): Promise<void>;
}

/** Matches at or above the job threshold go live; anything lower waits for a human. */
export function classify(confidence: number, threshold: number): MatchStatus {
  return confidence >= threshold ? "auto" : "review";
}

/** Deterministic stand-in for local development and tests. */
export class MockMatcher implements Matcher {
  readonly name = "mock";
  private readonly collections = new Map<string, Set<string>>();

  async indexReference(input: { collectionId: string; subjectId: string }): Promise<void> {
    const set = this.collections.get(input.collectionId) ?? new Set<string>();
    set.add(input.subjectId);
    this.collections.set(input.collectionId, set);
  }

  async match(input: { collectionId: string; image: Buffer }): Promise<FaceMatch[]> {
    const subjects = [...(this.collections.get(input.collectionId) ?? [])].sort();
    if (subjects.length === 0) return [];
    const h = hashString(input.image.subarray(0, 4096).toString("base64"));
    if (h % 5 === 0) return []; // no face found
    return [{ subjectId: subjects[h % subjects.length]!, confidence: h % 4 === 0 ? 0.6 + (h % 25) / 100 : 0.9 + (h % 10) / 100 }];
  }

  async deleteCollection(collectionId: string): Promise<void> {
    this.collections.delete(collectionId);
  }
}

export class RekognitionMatcher implements Matcher {
  readonly name = "rekognition";
  private readonly client = new RekognitionClient({ region: config.aws.region ?? undefined });

  private collection(jobId: string): string {
    return `snapbell-${jobId}`.replace(/[^a-zA-Z0-9_.-]/g, "-");
  }

  private async ensureCollection(id: string): Promise<void> {
    try {
      await this.client.send(new CreateCollectionCommand({ CollectionId: id }));
    } catch (err) {
      if (!(err instanceof ResourceAlreadyExistsException)) throw err;
    }
  }

  async indexReference(input: { collectionId: string; subjectId: string; image: Buffer }): Promise<void> {
    const id = this.collection(input.collectionId);
    await this.ensureCollection(id);
    await this.client.send(
      new IndexFacesCommand({ CollectionId: id, ExternalImageId: input.subjectId, Image: { Bytes: input.image }, MaxFaces: 1, QualityFilter: "AUTO" }),
    );
  }

  /** SearchFacesByImage only looks at the largest face, so group shots are searched face by face. */
  async match(input: { collectionId: string; image: Buffer }): Promise<FaceMatch[]> {
    const id = this.collection(input.collectionId);
    const detected = await this.client.send(new DetectFacesCommand({ Image: { Bytes: input.image } }));
    const meta = await sharp(input.image).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    const results = new Map<string, number>();
    for (const face of (detected.FaceDetails ?? []).slice(0, 40)) {
      const box = face.BoundingBox;
      if (!box || !width || !height) continue;
      // Pad each face so Rekognition has context, then search with the crop.
      const left = Math.max(0, Math.floor(((box.Left ?? 0) - (box.Width ?? 0) * 0.3) * width));
      const top = Math.max(0, Math.floor(((box.Top ?? 0) - (box.Height ?? 0) * 0.3) * height));
      const cropW = Math.min(width - left, Math.ceil((box.Width ?? 0) * 1.6 * width));
      const cropH = Math.min(height - top, Math.ceil((box.Height ?? 0) * 1.6 * height));
      if (cropW < 40 || cropH < 40) continue;
      const crop = await sharp(input.image).extract({ left, top, width: cropW, height: cropH }).jpeg().toBuffer();
      try {
        const search = await this.client.send(new SearchFacesByImageCommand({ CollectionId: id, Image: { Bytes: crop }, MaxFaces: 1, FaceMatchThreshold: 50 }));
        const best = search.FaceMatches?.[0];
        const subjectId = best?.Face?.ExternalImageId;
        if (subjectId && best.Similarity !== undefined) {
          results.set(subjectId, Math.max(results.get(subjectId) ?? 0, best.Similarity / 100));
        }
      } catch (err) {
        if (err instanceof ResourceNotFoundException) return [];
        // A crop without a usable face is not an error for the photo as a whole.
      }
    }
    return [...results.entries()].map(([subjectId, confidence]) => ({ subjectId, confidence }));
  }

  async deleteCollection(collectionId: string): Promise<void> {
    try {
      await this.client.send(new DeleteCollectionCommand({ CollectionId: this.collection(collectionId) }));
    } catch (err) {
      if (!(err instanceof ResourceNotFoundException)) throw err;
    }
  }
}

export function createMatcher(): Matcher {
  return rekognitionConfigured() ? new RekognitionMatcher() : new MockMatcher();
}
