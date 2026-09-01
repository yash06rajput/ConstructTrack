import type { AnalysisStatus } from "@prisma/client";

/**
 * One real detection, as persisted in AIAnalysis.detectedObjects. Only
 * ever written by lib/services/analysis.ts from actual YOLO11 output —
 * never client-supplied.
 */
export interface DetectionSummary {
  classId: number;
  className: string;
  confidence: number;
  bbox: [number, number, number, number];
}

/**
 * Plain, JSON-serializable shape for one image's AI analysis result.
 * `annotatedImageUrl` is a freshly generated signed URL (like
 * ConstructionImageSummary.imageUrl) — never a permanently-cached value.
 */
export interface AnalysisSummary {
  id: string;
  status: AnalysisStatus;
  modelVersion: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  detections: DetectionSummary[];
  objectCounts: Record<string, number>;
  averageConfidence: number | null;
  analysisSummary: string | null;
  annotatedImageUrl: string | null;
  processingTimeMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImageAnalysisStatusResult {
  /** Source of truth for image-level status — mirrors ConstructionImage.analysisStatus. */
  analysisStatus: AnalysisStatus;
  analysis: AnalysisSummary | null;
}

interface SerializableAnalysis {
  id: string;
  status: AnalysisStatus;
  modelVersion: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  detectedObjects: unknown;
  objectCounts: unknown;
  averageConfidence: number | null;
  analysisSummary: string | null;
  processingTimeMs: number | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toDetections(value: unknown): DetectionSummary[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      classId: Number(item.classId ?? 0),
      className: String(item.className ?? "unknown"),
      confidence: Number(item.confidence ?? 0),
      bbox: (Array.isArray(item.bbox) && item.bbox.length === 4
        ? (item.bbox as number[])
        : [0, 0, 0, 0]) as [number, number, number, number],
    }));
}

function toObjectCounts(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, count]) => [key, Number(count) || 0]),
  );
}

export function toAnalysisSummary(
  analysis: SerializableAnalysis,
  annotatedImageUrl: string | null,
): AnalysisSummary {
  return {
    id: analysis.id,
    status: analysis.status,
    modelVersion: analysis.modelVersion,
    imageWidth: analysis.imageWidth,
    imageHeight: analysis.imageHeight,
    detections: toDetections(analysis.detectedObjects),
    objectCounts: toObjectCounts(analysis.objectCounts),
    averageConfidence: analysis.averageConfidence,
    analysisSummary: analysis.analysisSummary,
    annotatedImageUrl,
    processingTimeMs: analysis.processingTimeMs,
    errorMessage: analysis.errorMessage,
    createdAt: analysis.createdAt.toISOString(),
    updatedAt: analysis.updatedAt.toISOString(),
  };
}
