import { prisma } from "@/lib/db";
import { notFound } from "@/lib/api/errors";
import {
  buildAiEvidenceNote,
  computeDelayPrediction,
  computeDelayPredictionHistory,
  type DelayPredictionResult,
  type DelayPredictionSnapshot,
} from "@/lib/services/delay-prediction";
import { compareDetections, type AnalyzedImageEvidence } from "@/lib/services/ai-evidence";

export interface ProjectDelayPredictionResponse {
  project: {
    id: string;
    name: string;
    startDate: string;
    expectedEndDate: string;
  };
  prediction: DelayPredictionResult;
  /** Dynamically reconstructed snapshots over time — see computeDelayPredictionHistory(). */
  history: DelayPredictionSnapshot[];
}

/**
 * Assembles everything GET /api/delay-prediction needs: looks up the
 * project and its progress records (the only trusted inputs — the client
 * submits nothing but `projectId`), runs the deterministic engine from
 * lib/services/delay-prediction.ts, and attaches an optional, purely
 * factual YOLO11 evidence note built from already-persisted AIAnalysis
 * object counts. Nothing here is persisted as a new row — see the
 * persistence decision in docs/delay-prediction.md.
 */
export async function getProjectDelayPrediction(projectId: string): Promise<ProjectDelayPredictionResponse> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, startDate: true, expectedEndDate: true },
  });
  if (!project) throw notFound("Project", projectId);

  const progressRecords = await prisma.progressRecord.findMany({
    where: { projectId },
    orderBy: { recordDate: "asc" },
    select: { recordDate: true, plannedProgress: true, actualProgress: true },
  });

  const projectDates = { startDate: project.startDate, expectedEndDate: project.expectedEndDate };
  const prediction = computeDelayPrediction(projectDates, progressRecords);
  const history = computeDelayPredictionHistory(projectDates, progressRecords);

  // Optional, secondary-only AI evidence: a factual detection-count
  // comparison between the earliest and latest COMPLETED analyses for
  // this project. Deliberately lightweight (object counts only, no
  // signed URLs / full per-box detections) since this endpoint never
  // displays the images themselves.
  const analyzedImages = await prisma.constructionImage.findMany({
    where: { projectId, analysis: { status: "COMPLETED" } },
    orderBy: { uploadedAt: "asc" },
    select: {
      id: true,
      uploadedAt: true,
      originalFilename: true,
      analysis: { select: { objectCounts: true } },
    },
  });

  let aiEvidenceNote: string | null = null;
  if (analyzedImages.length >= 2) {
    const toEvidence = (image: (typeof analyzedImages)[number]): AnalyzedImageEvidence => ({
      imageId: image.id,
      date: image.uploadedAt.toISOString(),
      originalFilename: image.originalFilename,
      objectCounts: (image.analysis?.objectCounts as Record<string, number> | null) ?? {},
    });
    const earlier = toEvidence(analyzedImages[0]);
    const later = toEvidence(analyzedImages[analyzedImages.length - 1]);
    aiEvidenceNote = buildAiEvidenceNote(compareDetections(earlier, later), earlier.date, later.date);
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      startDate: project.startDate.toISOString(),
      expectedEndDate: project.expectedEndDate.toISOString(),
    },
    prediction: { ...prediction, aiEvidenceNote },
    history,
  };
}
