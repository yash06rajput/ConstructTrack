import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/api/errors";
import { estimateDelay } from "@/lib/services/delay-prediction";
import type { PredictDelayInput } from "@/lib/validation/delay";

export async function listDelayPredictions(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound("Project", projectId);

  return prisma.delayPrediction.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Computes (or recomputes) the baseline delay prediction for one
 * ProgressRecord. See lib/services/delay-prediction.ts and
 * docs/delay-prediction.md for the methodology.
 */
export async function predictDelay(input: PredictDelayInput) {
  const record = await prisma.progressRecord.findUnique({
    where: { id: input.progressRecordId },
    include: { project: true },
  });
  if (!record) throw notFound("ProgressRecord", input.progressRecordId);
  if (record.deviation === null) {
    throw validationError(
      "This progress record has no actualProgress yet, so deviation cannot be computed.",
    );
  }

  const result = estimateDelay({
    deviation: record.deviation,
    projectStartDate: record.project.startDate,
    projectExpectedEndDate: record.project.expectedEndDate,
  });

  return prisma.delayPrediction.upsert({
    where: { progressRecordId: record.id },
    create: {
      projectId: record.projectId,
      progressRecordId: record.id,
      deviation: record.deviation,
      estimatedDelayDays: result.estimatedDelayDays,
      riskLevel: result.riskLevel,
      explanation: result.explanation,
      methodology: result.methodology,
    },
    update: {
      deviation: record.deviation,
      estimatedDelayDays: result.estimatedDelayDays,
      riskLevel: result.riskLevel,
      explanation: result.explanation,
      methodology: result.methodology,
    },
  });
}
