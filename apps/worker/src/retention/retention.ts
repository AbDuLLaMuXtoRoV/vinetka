import { config } from "../config.js";
import type { Matcher } from "../matching/matcher.js";

const DAY_MS = 86_400_000;

export interface JobFaceData {
  jobId: string;
  /** Picture day. */
  date: string;
  /** Ordering deadline, if any; the season ends at the later of picture day and deadline. */
  deadline: string | null;
}

/**
 * Biometrics policy: face data (reference photos and embeddings) is deleted
 * FACE_RETENTION_DAYS after the end of a job's season. Selfies from Find Me are
 * never stored, so they never reach this job.
 */
export function expiredJobs(jobs: JobFaceData[], now = new Date(), retentionDays = config.faceRetentionDays): JobFaceData[] {
  return jobs.filter((job) => {
    const seasonEnd = Math.max(Date.parse(job.date), job.deadline ? Date.parse(job.deadline) : 0);
    return seasonEnd + retentionDays * DAY_MS <= now.getTime();
  });
}

export async function purgeFaceData(matcher: Matcher, jobs: JobFaceData[], now = new Date()): Promise<string[]> {
  const expired = expiredJobs(jobs, now);
  for (const job of expired) await matcher.deleteCollection(job.jobId);
  return expired.map((j) => j.jobId);
}
