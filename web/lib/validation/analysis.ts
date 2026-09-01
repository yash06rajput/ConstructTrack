import { z } from "zod";

export const runAnalysisSchema = z.object({
  constructionImageId: z.string().min(1),
});

export type RunAnalysisInput = z.infer<typeof runAnalysisSchema>;
