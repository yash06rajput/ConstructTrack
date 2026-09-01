import { prisma } from "@/lib/db";
import { notFound } from "@/lib/api/errors";
import { computeDeviation, computeProgressStatus } from "@/lib/services/progress";
import type { CreateProgressRecordInput, UpdateProgressRecordInput } from "@/lib/validation/progress";

export async function listProgressRecords(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound("Project", projectId);

  return prisma.progressRecord.findMany({
    where: { projectId },
    orderBy: { recordDate: "asc" },
  });
}

export async function createProgressRecord(input: CreateProgressRecordInput) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw notFound("Project", input.projectId);

  const deviation = computeDeviation(input.plannedProgress, input.actualProgress);
  const status = computeProgressStatus(deviation);

  return prisma.progressRecord.create({
    data: {
      projectId: input.projectId,
      recordDate: input.recordDate,
      plannedProgress: input.plannedProgress,
      actualProgress: input.actualProgress,
      notes: input.notes,
      deviation,
      status,
    },
  });
}

export async function getProgressRecordOrThrow(id: string) {
  const record = await prisma.progressRecord.findUnique({ where: { id } });
  if (!record) throw notFound("ProgressRecord", id);
  return record;
}

/**
 * Recomputes deviation/status from whatever the record's planned/actual
 * values are AFTER applying the update, so an edit that only changes
 * `notes` doesn't silently leave a stale deviation, and an edit that
 * clears `actualProgress` correctly clears deviation/status too (rather
 * than keeping a deviation computed against a value that no longer
 * exists).
 */
export async function updateProgressRecord(id: string, input: UpdateProgressRecordInput) {
  const existing = await getProgressRecordOrThrow(id);

  const plannedProgress = input.plannedProgress ?? existing.plannedProgress;
  const actualProgress =
    input.actualProgress === undefined ? existing.actualProgress : input.actualProgress;

  const deviation = computeDeviation(plannedProgress, actualProgress);
  const status = computeProgressStatus(deviation);

  return prisma.progressRecord.update({
    where: { id },
    data: {
      recordDate: input.recordDate,
      plannedProgress,
      actualProgress,
      notes: input.notes === undefined ? undefined : input.notes,
      deviation,
      status,
    },
  });
}

export async function deleteProgressRecord(id: string) {
  await getProgressRecordOrThrow(id);
  await prisma.progressRecord.delete({ where: { id } });
  return { id };
}
