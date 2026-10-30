import { z } from "zod";
import { currentLocale, issueSummary, v, zodErrorMap } from "../i18n";
import { badRequest } from "./errors";

/** Parse a request body or query against a schema; 400 validation_failed with per-field details on failure. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const locale = currentLocale();
  const result = schema.safeParse(input ?? {}, { error: zodErrorMap(locale) });
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    throw badRequest(
      "validation_failed",
      issues.map((i) => issueSummary(locale, i.path, i.message)).join("; "),
      issues,
    );
  }
  return result.data;
}

/** Any string Date can parse, normalised to an ISO timestamp. */
export const isoDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { error: () => v().date })
  .transform((s) => new Date(s).toISOString());

export const cents = z.number().int().min(0).max(100_000_000);

export const id = z.string().min(1).max(100);

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export const addressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).nullable().optional().transform((v) => v || null),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().toUpperCase().refine((s) => US_STATES.includes(s), { error: () => v().usState }),
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, { error: () => v().zip }),
  country: z.string().trim().toUpperCase().refine((c) => c === "US", { error: () => v().usOnly }),
});

export function query(q: Record<string, unknown>, key: string): string | undefined {
  const v = q[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}
