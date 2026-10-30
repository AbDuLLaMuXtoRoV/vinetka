import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { config } from "../config";

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function randomDigits(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += randomInt(0, 10).toString();
  return out;
}

export function hmac(data: string, secret = config.authSecret): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// --- Passwords (scrypt) ---------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  return safeEqual(scryptSync(password, salt, 32).toString("base64url"), hash);
}

// --- Session tokens -----------------------------------------------------------------

export type TokenKind = "staff" | "parent" | "admin";

export interface TokenPayload {
  k: TokenKind;
  /** Member id, parent id, or admin email. */
  sub: string;
  /** Studio id for staff tokens. */
  sid?: string;
  /** Expiry, seconds since epoch. */
  exp: number;
}

export const TOKEN_TTL_SEC: Record<TokenKind, number> = {
  staff: 7 * 86_400,
  parent: 30 * 86_400,
  admin: 12 * 3_600,
};

/** `v1.<payload>.<hmac>` — stateless, HMAC-SHA256 signed, expiring. */
export function signToken(payload: Omit<TokenPayload, "exp">, ttlSec = TOKEN_TTL_SEC[payload.k]): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec })).toString("base64url");
  return `v1.${body}.${hmac(`token:${body}`)}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const [version, body, sig] = token.split(".");
  if (version !== "v1" || !body || !sig || !safeEqual(sig, hmac(`token:${body}`))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- Signed URLs (media, uploads, downloads, exports) ---------------------------------

function canonical(pathname: string, params: Record<string, string>): string {
  const keys = Object.keys(params).filter((k) => k !== "sig").sort();
  return `${pathname}?${keys.map((k) => `${k}=${params[k]}`).join("&")}`;
}

/**
 * Absolute URL under /v1 whose query carries an expiry and an HMAC over the path
 * and every other parameter, so nothing in it can be changed without breaking the signature.
 */
export function signedUrl(pathname: string, params: Record<string, string>, ttlSec: number): string {
  // Round expiry so repeated renders produce identical (cacheable) URLs.
  const bucket = Math.min(600, Math.max(60, Math.floor(ttlSec / 6)));
  const exp = Math.ceil((Date.now() / 1000 + ttlSec) / bucket) * bucket;
  const all = { ...params, exp: String(exp) };
  const sig = hmac(`url:${canonical(pathname, all)}`);
  const qs = new URLSearchParams({ ...all, sig }).toString();
  return `${config.publicApiUrl}/v1${pathname}?${qs}`;
}

export function verifySignedUrl(pathname: string, query: Record<string, unknown>): Record<string, string> | null {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) if (typeof v === "string") params[k] = v;
  const sig = params.sig;
  const exp = Number(params.exp);
  if (!sig || !Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  if (!safeEqual(sig, hmac(`url:${canonical(pathname, params)}`))) return null;
  return params;
}
