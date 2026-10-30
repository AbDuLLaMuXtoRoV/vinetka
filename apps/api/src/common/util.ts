import type { Request } from "express";
import { err } from "../i18n";
import { tooMany } from "./errors";

export const nowIso = () => new Date().toISOString();
export const DAY_MS = 86_400_000;

export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

/** "parent@example.com" → "p•••@example.com", "+15555550123" → "•••-•••-0123". */
export function maskDestination(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.includes("@")) {
    const [user, domain] = value.split("@");
    return `${(user ?? "").slice(0, 1)}•••@${domain}`;
  }
  const digits = value.replace(/\D/g, "");
  return `•••-•••-${digits.slice(-4)}`;
}

/** Fixed-window, in-memory rate limiter keyed by caller (IP, destination…). */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    /** Resolved when the limit trips, in the caller's language. */
    private readonly message: () => string = () => err().rate.generic,
  ) {}

  hit(key: string): void {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      if (this.hits.size > 50_000) this.sweep(now);
      return;
    }
    entry.count++;
    if (entry.count > this.limit) throw tooMany(this.message(), Math.ceil((entry.resetAt - now) / 1000));
  }

  private sweep(now: number) {
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "studio"
  );
}

export function sum<T>(rows: T[], pick: (row: T) => number): number {
  let total = 0;
  for (const r of rows) total += pick(r);
  return total;
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** Run later without keeping the process (or a test run) alive. */
export function later(ms: number, fn: () => void): void {
  setTimeout(fn, ms).unref();
}

// --- CSV ------------------------------------------------------------------------

/** RFC 4180-ish parser: quoted fields, escaped quotes, commas and newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export function toCsv(rows: Array<Array<string | number | boolean | null | undefined>>): string {
  const cell = (v: string | number | boolean | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
