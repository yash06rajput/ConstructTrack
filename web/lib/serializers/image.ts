import type { AnalysisStatus } from "@prisma/client";

/**
 * Plain, JSON-serializable shape for a construction image, used both for
 * API responses and for passing Server Component data down to Client
 * Components. `imageUrl` is always a freshly generated signed URL (see
 * lib/services/images.ts) — never a permanently-cached value.
 *
 * `objectCounts`/`analysisCompletedAt` are the SMALL AI-evidence summary
 * (see lib/services/ai-evidence.ts) — deliberately not the full detection
 * array, which stays behind the lazy per-image GET /api/analysis fetch
 * (see lib/serializers/analysis.ts) used by the image detail panel.
 */
export interface ConstructionImageSummary {
  id: string;
  projectId: string;
  progressRecordId: string | null;
  storagePath: string;
  imageUrl: string;
  originalFilename: string;
  fileSizeBytes: number | null;
  analysisStatus: AnalysisStatus;
  uploadedAt: string;
  objectCounts: Record<string, number> | null;
  analysisCompletedAt: string | null;
}

interface SerializableImage {
  id: string;
  projectId: string;
  progressRecordId: string | null;
  storagePath: string;
  imageUrl: string;
  originalFilename: string;
  fileSizeBytes: number | null;
  analysisStatus: AnalysisStatus;
  uploadedAt: Date;
  analysis: {
    status: AnalysisStatus;
    objectCounts: unknown;
    createdAt: Date;
  } | null;
}

function toObjectCounts(value: unknown): Record<string, number> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, count]) => [key, Number(count) || 0]),
  );
}

export function toImageSummary(image: SerializableImage): ConstructionImageSummary {
  // Only surface object counts for a COMPLETED analysis — a stale/failed
  // analysis's counts (if any survive from a prior successful run, see
  // lib/services/analysis.ts's partial-update-on-failure behavior) must
  // not be presented as current evidence.
  const hasCompletedAnalysis = image.analysis?.status === "COMPLETED";

  return {
    id: image.id,
    projectId: image.projectId,
    progressRecordId: image.progressRecordId,
    storagePath: image.storagePath,
    imageUrl: image.imageUrl,
    originalFilename: image.originalFilename,
    fileSizeBytes: image.fileSizeBytes,
    analysisStatus: image.analysisStatus,
    uploadedAt: image.uploadedAt.toISOString(),
    objectCounts: hasCompletedAnalysis ? toObjectCounts(image.analysis!.objectCounts) : null,
    analysisCompletedAt: hasCompletedAnalysis ? image.analysis!.createdAt.toISOString() : null,
  };
}
