import type { NextRequest } from "next/server";

import { withApiErrorHandling } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { validationError } from "@/lib/api/errors";
import { runAnalysisSchema } from "@/lib/validation/analysis";
import { getAnalysis, runAnalysis } from "@/lib/services/analysis";

// YOLO11 inference on a hosted AI service (which may be waking from sleep
// on a free tier) can take well over the default serverless timeout.
export const maxDuration = 60;

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const constructionImageId = request.nextUrl.searchParams.get("constructionImageId");
  if (!constructionImageId) {
    throw validationError('Query parameter "constructionImageId" is required.');
  }
  const analysis = await getAnalysis(constructionImageId);
  return ok(analysis);
});

/**
 * Triggers CV analysis for an already-uploaded image via the Python AI
 * service. Returns AI_SERVICE_UNAVAILABLE (503) if that service isn't
 * running yet — expected until the AI service is deployed.
 */
export const POST = withApiErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const input = runAnalysisSchema.parse(body);
  const analysis = await runAnalysis(input);
  return created(analysis);
});
