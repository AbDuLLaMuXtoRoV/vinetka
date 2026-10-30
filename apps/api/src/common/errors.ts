import { Catch, HttpException, Logger, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { err, errorMessages, issueSummary, resolveLocale, zodErrorMap } from "../i18n";

/** Every error leaves the API as an ApiErrorBody: { statusCode, error, message, details? }. */
export class ApiError extends HttpException {
  readonly code: string;

  constructor(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
    super({ statusCode: status, error: code, message, ...extra }, status);
    this.code = code;
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new ApiError(400, code, message, details === undefined ? {} : { details });
// Messages are resolved when the error is created, in the current request's language (see src/i18n).
export const unauthorized = (message = err().generic.unauthorized) => new ApiError(401, "unauthorized", message);
export const forbidden = (message = err().generic.forbidden) => new ApiError(403, "forbidden", message);
export const notFound = (message: string) => new ApiError(404, "not_found", message);
export const conflict = (code: string, message: string, extra: Record<string, unknown> = {}) =>
  new ApiError(409, code, message, extra);
export const tooMany = (message: string, retryAfterSec: number) =>
  new ApiError(429, "rate_limited", message, { details: { retryAfterSec } });

const CODES: Record<number, string> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  405: "method_not_allowed",
  409: "conflict",
  413: "payload_too_large",
  415: "unsupported_media_type",
  429: "rate_limited",
};

function zodBody(error: ZodError, req: Request) {
  const locale = resolveLocale(req);
  const map = zodErrorMap(locale);
  const issues = error.issues.map((i) => {
    // Custom rules already carry a localized message; re-word Zod's built-in ones.
    const message = i.code === "custom" ? i.message : (() => {
      const m = map(i as never);
      return typeof m === "string" ? m : (m?.message ?? i.message);
    })();
    return { path: i.path.join("."), message };
  });
  return {
    statusCode: 400,
    error: "validation_failed",
    message: issues.map((i) => issueSummary(locale, i.path, i.message)).join("; "),
    details: issues,
  };
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger("Error");

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<Request>();
    const t = errorMessages[resolveLocale(req)].generic;
    if (exception instanceof ApiError) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    if (exception instanceof ZodError) {
      res.status(400).json(zodBody(exception, req));
      return;
    }
    if (exception instanceof HttpException) {
      // Framework errors (unknown route, wrong method…) carry English technical text: replace it.
      const status = exception.getStatus();
      res.status(status).json({ statusCode: status, error: CODES[status] ?? "error", message: t.byStatus[status] ?? t.byStatus[400] });
      return;
    }
    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    res.status(500).json({ statusCode: 500, error: "internal_error", message: t.internal });
  }
}

/** Express error middleware for failures before Nest routing (malformed JSON, body too large). */
export function bodyParserErrors(error: { status?: number; type?: string; message?: string }, req: Request, res: Response, next: NextFunction): void {
  if (!error || typeof error.status !== "number") return next(error);
  const status = error.status;
  const t = errorMessages[resolveLocale(req)].generic;
  const message = error.type === "entity.parse.failed" ? t.invalidJson : (t.byStatus[status] ?? t.byStatus[400]);
  res.status(status).json({ statusCode: status, error: error.type === "entity.parse.failed" ? "invalid_json" : (CODES[status] ?? "error"), message });
}
