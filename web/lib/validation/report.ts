import { z } from "zod";

/**
 * The client submits only a `projectId` — every value that ends up in the
 * generated report (progress, images, AI evidence, delay prediction, risk
 * score) is retrieved and computed server-side. The client can never
 * submit riskScore, delayProbability, completionPercentage,
 * predictedCompletionDate, or detectedObjects.
 */
export const generateReportSchema = z.object({
  projectId: z.string().min(1),
});

export type GenerateReportInput = z.infer<typeof generateReportSchema>;
