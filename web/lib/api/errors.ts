/**
 * Consistent API error/response foundation.
 *
 * Every API route should return JSON shaped either as:
 *   { success: true, data: T }
 * or:
 *   { success: false, error: { code, message, details? } }
 *
 * so the frontend can reliably branch on `success` and, on failure, on
 * `error.code` without parsing HTTP status text.
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "AI_SERVICE_UNAVAILABLE"
  | "EXTERNAL_SERVICE_ERROR"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  AI_SERVICE_UNAVAILABLE: 503,
  EXTERNAL_SERVICE_ERROR: 502,
  DATABASE_ERROR: 500,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }

  get status(): number {
    return STATUS_BY_CODE[this.code];
  }
}

export function notFound(resource: string, id?: string): ApiError {
  return new ApiError(
    "NOT_FOUND",
    id ? `${resource} with id "${id}" was not found.` : `${resource} was not found.`,
  );
}

export function validationError(message: string, details?: unknown): ApiError {
  return new ApiError("VALIDATION_ERROR", message, details);
}

export function aiServiceUnavailable(message = "The AI analysis service is currently unavailable."): ApiError {
  return new ApiError("AI_SERVICE_UNAVAILABLE", message);
}
