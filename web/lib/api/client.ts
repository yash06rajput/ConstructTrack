/**
 * Thin fetch wrapper for the browser -> Next.js API calls made by client
 * components (project create/edit/delete). Centralizes the
 * { success, data } / { success, error } envelope handling established in
 * lib/api/response.ts and lib/api/handler.ts, so components don't each
 * re-implement it.
 */

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  code: string;
  details?: unknown;

  constructor(error: ApiErrorShape) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
  }
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  // Don't force a JSON content-type on FormData bodies — the browser needs
  // to set its own multipart boundary header.
  const isFormData = init?.body instanceof FormData;

  const response = await fetch(input, {
    ...init,
    headers: isFormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
  });

  const body = await response.json().catch(() => null);

  if (!body || body.success !== true) {
    const error: ApiErrorShape = body?.error ?? {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
    };
    throw new ApiClientError(error);
  }

  return body.data as T;
}

export const apiClient = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  postFormData: <T>(url: string, formData: FormData) =>
    request<T>(url, { method: "POST", body: formData }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
