import type { NextRequest } from "next/server";

import { withApiErrorHandling } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { delayPredictionQuerySchema } from "@/lib/validation/delay-prediction";
import { getProjectDelayPrediction } from "@/lib/services/delay-prediction.service";

/**
 * GET /api/delay-prediction?projectId=...
 *
 * The client submits only `projectId`. Every schedule date, progress
 * record, and AI-evidence value used to compute the result is read
 * server-side from the database — the client can never submit a
 * riskScore, delayProbability, or predictedCompletionDate as a trusted
 * value. See lib/services/delay-prediction.ts for the deterministic
 * engine and docs/delay-prediction.md for the full methodology.
 */
export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const { projectId } = delayPredictionQuerySchema.parse({
    projectId: request.nextUrl.searchParams.get("projectId"),
  });
  const result = await getProjectDelayPrediction(projectId);
  return ok(result);
});
