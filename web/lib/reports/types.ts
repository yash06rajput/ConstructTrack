import type { AnalysisStatus, ProjectStatus } from "@prisma/client";

import type { ProgressSummary } from "@/lib/services/progress-analytics";
import type { DelayPredictionResult } from "@/lib/services/delay-prediction";
import type { ProgressSnapshot } from "@/lib/serializers/project";
import type { DetectionComparison } from "@/lib/services/ai-evidence";

/**
 * The full, JSON-serializable report contract. Every value here is either
 * read straight from the database or produced by an already-existing,
 * reused analytical function (computeProgressSummary, computeDelayPrediction,
 * ai-evidence.ts) — nothing in this file computes a new metric from
 * scratch. See lib/services/report-builder.ts for how it's assembled and
 * docs/reporting.md for the full architecture.
 */
export interface ReportHeader {
  reportTitle: string;
  projectName: string;
  projectLocation: string | null;
  generatedAt: string;
  /** Earliest recorded progress-record date (or project start if none) — real data, never invented. */
  reportingPeriodStart: string;
  /** Latest recorded progress-record date (or generation time if none). */
  reportingPeriodEnd: string;
  projectStartDate: string;
  expectedEndDate: string;
  projectStatus: ProjectStatus;
}

export interface ReportExecutiveSummary {
  recordedProgress: number | null;
  plannedProgress: number | null;
  variance: number | null;
  scheduleStatusLabel: string | null;
  trendAvailable: boolean;
  trendReason: string | null;
  averageGainPerWeek: number | null;
  /** The full, verbatim project-level delay engine result — never re-derived here. */
  prediction: DelayPredictionResult;
}

export interface ReportProjectOverview {
  name: string;
  description: string | null;
  location: string | null;
  startDate: string;
  expectedEndDate: string;
  status: ProjectStatus;
  progressRecordCount: number;
  imageCount: number;
  analyzedImageCount: number;
  latestProgressRecordDate: string | null;
}

export interface ReportProgressAnalytics {
  /** The exact progress-analytics ProgressSummary — includes current + trend. */
  current: ProgressSummary;
  history: ProgressSnapshot[];
}

export interface ReportImageTimelineEntry {
  id: string;
  originalFilename: string;
  uploadedAt: string;
  analysisStatus: AnalysisStatus;
  /** Sum of this image's real detected-object counts, or null if not yet analyzed. */
  totalDetections: number | null;
}

export interface ReportImageSummary {
  totalImages: number;
  analyzedImages: number;
  pendingImages: number;
  failedImages: number;
  timeline: ReportImageTimelineEntry[];
}

export interface ReportObjectCount {
  className: string;
  count: number;
}

export interface ReportAiAnalysis {
  available: boolean;
  analyzedImageCount: number;
  totalDetections: number | null;
  averageConfidence: number | null;
  modelVersion: string | null;
  uniqueClasses: string[];
  objectCounts: ReportObjectCount[];
  comparison:
    | (DetectionComparison & { earlierDate: string; laterDate: string; daysBetween: number })
    | null;
}

export interface ReportData {
  header: ReportHeader;
  executiveSummary: ReportExecutiveSummary;
  projectOverview: ReportProjectOverview;
  progressAnalytics: ReportProgressAnalytics;
  imageSummary: ReportImageSummary;
  aiAnalysis: ReportAiAnalysis;
  /** Duplicated reference to executiveSummary.prediction for section-level access — same object, not recomputed. */
  delayPrediction: DelayPredictionResult;
  generatedAt: string;
}
