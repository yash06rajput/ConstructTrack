import type { AnalysisStatus } from "@prisma/client";

import {
  buildObjectCountHistory,
  compareDetections,
  daysBetween,
  listAvailableObjectClasses,
  type AnalyzedImageEvidence,
} from "@/lib/services/ai-evidence";
import type { ReportAiAnalysis, ReportImageSummary } from "@/lib/reports/types";

/**
 * The two report-only analytics pieces that don't already exist elsewhere
 * (image-status counts and an aggregated AI object-count table). Progress
 * analytics and delay prediction are NOT recomputed here — report-builder.ts
 * calls the existing progress-analytics and delay-prediction engines directly. Pure, no Prisma/Next
 * imports, independently testable.
 */
export interface ReportImageInput {
  id: string;
  originalFilename: string;
  uploadedAt: string;
  analysisStatus: AnalysisStatus;
  objectCounts: Record<string, number> | null;
}

export function computeReportImageSummary(images: ReportImageInput[]): ReportImageSummary {
  const totalImages = images.length;
  const analyzedImages = images.filter((image) => image.analysisStatus === "COMPLETED").length;
  const pendingImages = images.filter(
    (image) => image.analysisStatus === "PENDING" || image.analysisStatus === "PROCESSING",
  ).length;
  const failedImages = images.filter((image) => image.analysisStatus === "FAILED").length;

  const timeline = [...images]
    .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime())
    .map((image) => ({
      id: image.id,
      originalFilename: image.originalFilename,
      uploadedAt: image.uploadedAt,
      analysisStatus: image.analysisStatus,
      totalDetections: image.objectCounts
        ? Object.values(image.objectCounts).reduce((sum, count) => sum + count, 0)
        : null,
    }));

  return { totalImages, analyzedImages, pendingImages, failedImages, timeline };
}

export function computeReportAiAnalysis(
  images: ReportImageInput[],
  options: { modelVersion: string | null; averageConfidence: number | null },
): ReportAiAnalysis {
  const analyzed: AnalyzedImageEvidence[] = images
    .filter((image) => image.objectCounts !== null)
    .map((image) => ({
      imageId: image.id,
      date: image.uploadedAt,
      originalFilename: image.originalFilename,
      objectCounts: image.objectCounts as Record<string, number>,
    }));

  if (analyzed.length === 0) {
    return {
      available: false,
      analyzedImageCount: 0,
      totalDetections: null,
      averageConfidence: null,
      modelVersion: null,
      uniqueClasses: [],
      objectCounts: [],
      comparison: null,
    };
  }

  const history = buildObjectCountHistory(analyzed);
  const totalDetections = history.reduce((sum, point) => sum + point.totalDetections, 0);
  const uniqueClasses = listAvailableObjectClasses(analyzed);

  const aggregate = new Map<string, number>();
  for (const image of analyzed) {
    for (const [className, count] of Object.entries(image.objectCounts)) {
      aggregate.set(className, (aggregate.get(className) ?? 0) + count);
    }
  }
  const objectCounts = [...aggregate.entries()]
    .map(([className, count]) => ({ className, count }))
    .sort((a, b) => b.count - a.count);

  let comparison: ReportAiAnalysis["comparison"] = null;
  if (history.length >= 2) {
    const earlier = history[0];
    const later = history[history.length - 1];
    const comparisonResult = compareDetections(
      {
        imageId: earlier.imageId,
        date: earlier.date,
        originalFilename: earlier.originalFilename,
        objectCounts: earlier.objectCounts,
      },
      {
        imageId: later.imageId,
        date: later.date,
        originalFilename: later.originalFilename,
        objectCounts: later.objectCounts,
      },
    );
    comparison = {
      ...comparisonResult,
      earlierDate: earlier.date,
      laterDate: later.date,
      daysBetween: daysBetween(earlier.date, later.date),
    };
  }

  return {
    available: true,
    analyzedImageCount: analyzed.length,
    totalDetections,
    averageConfidence: options.averageConfidence,
    modelVersion: options.modelVersion,
    uniqueClasses,
    objectCounts,
    comparison,
  };
}
