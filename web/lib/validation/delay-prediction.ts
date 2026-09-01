import { z } from "zod";

/**
 * The client may submit a `projectId` and nothing else — every other value
 * used by the delay-prediction engine (schedule dates, progress records,
 * AI evidence) is looked up server-side from the database. The client can
 * never submit a riskScore, delayProbability, or predictedCompletionDate.
 */
export const delayPredictionQuerySchema = z.object({
  projectId: z.string().min(1, 'Query parameter "projectId" is required.'),
});

export type DelayPredictionQuery = z.infer<typeof delayPredictionQuerySchema>;
