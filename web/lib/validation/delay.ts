import { z } from "zod";

export const predictDelaySchema = z.object({
  progressRecordId: z.string().min(1),
});

export type PredictDelayInput = z.infer<typeof predictDelaySchema>;
