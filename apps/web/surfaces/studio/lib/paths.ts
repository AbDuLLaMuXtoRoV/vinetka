/** Where the Studio app is mounted on the site. */
export const STUDIO_BASE = "/studio";

/**
 * Links the API returns (publish checklist, home to-dos) are relative to the
 * Studio app, e.g. "/jobs/job_1/roster". Mount them under /studio; paths that
 * already carry the prefix, or aren't site paths, are left unchanged.
 */
export function studioHref(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (path === STUDIO_BASE || path.startsWith(`${STUDIO_BASE}/`)) return path;
  return `${STUDIO_BASE}${path}`;
}
