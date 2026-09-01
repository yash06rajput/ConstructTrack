import type { ProjectStatus } from "@prisma/client";

import { computeProgressSummary, type ProgressRecordLike } from "@/lib/services/progress-analytics";
import { computeDelayPrediction } from "@/lib/services/delay-prediction";
import type { ProgressSnapshot } from "@/lib/serializers/project";
import { computeReportAiAnalysis, computeReportImageSummary, type ReportImageInput } from "@/lib/services/report-analytics";
import { buildReportTitle } from "@/lib/reports/formatting";
import type { ReportData } from "@/lib/reports/types";

export interface BuildReportInput {
  project: {
    name: string;
    description: string | null;
    location: string | null;
    status: ProjectStatus;
    startDate: string;
    expectedEndDate: string;
  };
  records: ProgressSnapshot[];
  images: ReportImageInput[];
  aiModelVersion: string | null;
  aiAverageConfidence: number | null;
  /** Injectable for deterministic tests; defaults to the current time. */
  generatedAt?: string;
}

function sortByDateAsc(records: ProgressSnapshot[]): ProgressSnapshot[] {
  return [...records].sort((a, b) => new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime());
}

/**
 * Composes the full ReportData contract from already-fetched, real project
 * data. This is the "report composition" layer: it never queries the
 * database itself (see lib/services/reports.ts for that) and never
 * computes a schedule/risk formula itself — every analytical number comes
 * from the existing Prompt 5/6 engines (computeProgressSummary,
 * computeDelayPrediction) or the report-only aggregations in
 * report-analytics.ts. Pure and deterministic given the same inputs.
 */
export function buildReportData(input: BuildReportInput): ReportData {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const { project, records, images } = input;

  const progressSummary = computeProgressSummary(records as ProgressRecordLike[]);
  const delayPrediction = computeDelayPrediction(
    { startDate: project.startDate, expectedEndDate: project.expectedEndDate },
    records as ProgressRecordLike[],
  );
  const imageSummary = computeReportImageSummary(images);
  const aiAnalysis = computeReportAiAnalysis(images, {
    modelVersion: input.aiModelVersion,
    averageConfidence: input.aiAverageConfidence,
  });

  const sortedRecords = sortByDateAsc(records);
  const reportingPeriodStart = sortedRecords[0]?.recordDate ?? project.startDate;
  const reportingPeriodEnd = sortedRecords[sortedRecords.length - 1]?.recordDate ?? generatedAt;
  const latestProgressRecordDate = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1].recordDate : null;

  return {
    header: {
      reportTitle: buildReportTitle(project.name),
      projectName: project.name,
      projectLocation: project.location,
      generatedAt,
      reportingPeriodStart,
      reportingPeriodEnd,
      projectStartDate: project.startDate,
      expectedEndDate: project.expectedEndDate,
      projectStatus: project.status,
    },
    executiveSummary: {
      recordedProgress: progressSummary.currentActual,
      plannedProgress: progressSummary.currentPlanned,
      variance: progressSummary.variance,
      scheduleStatusLabel: progressSummary.statusLabel,
      trendAvailable: progressSummary.trend.available,
      trendReason: progressSummary.trend.reason,
      averageGainPerWeek: progressSummary.trend.averageGainPerWeek,
      prediction: delayPrediction,
    },
    projectOverview: {
      name: project.name,
      description: project.description,
      location: project.location,
      startDate: project.startDate,
      expectedEndDate: project.expectedEndDate,
      status: project.status,
      progressRecordCount: records.length,
      imageCount: imageSummary.totalImages,
      analyzedImageCount: imageSummary.analyzedImages,
      latestProgressRecordDate,
    },
    progressAnalytics: {
      current: progressSummary,
      history: sortedRecords,
    },
    imageSummary,
    aiAnalysis,
    delayPrediction,
    generatedAt,
  };
}
