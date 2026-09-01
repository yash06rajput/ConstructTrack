import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { ApiError } from "@/lib/api/errors";

/**
 * Wraps a Next.js route handler so every route gets identical error
 * handling without repeating try/catch boilerplate. Route handlers should
 * throw (ApiError, ZodError, or a Prisma error) rather than return error
 * responses directly.
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function toErrorResponse(error: unknown): NextResponse {
  // Explicit application errors (not found, validation, AI service down, ...)
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }

  // Request body / query failed schema validation.
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  // Known Prisma errors (unique constraint, record not found, etc.)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "The requested record was not found." } },
        { status: 404 },
      );
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: "A record with these values already exists.",
            details: error.meta,
          },
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "DATABASE_ERROR", message: "A database error occurred." } },
      { status: 500 },
    );
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}
