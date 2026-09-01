import type { NextRequest } from "next/server";

import { withApiErrorHandling } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { validationError } from "@/lib/api/errors";
import { predictDelaySchema } from "@/lib/validation/delay";
import { listDelayPredictions, predictDelay } from "@/lib/services/delay.service";

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    throw validationError('Query parameter "projectId" is required.');
  }
  const predictions = await listDelayPredictions(projectId);
  return ok(predictions);
});

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const input = predictDelaySchema.parse(body);
  const prediction = await predictDelay(input);
  return created(prediction);
});
