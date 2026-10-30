import { cache } from "react";
import { load } from "./api";

/** Per-request memoized reads shared by a layout and its pages. */
export const getJob = cache((id: string) => load((c) => c.jobs.get(id)));
export const getSubjects = cache((jobId: string) => load((c) => c.subjects.list(jobId)));
