import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { notFound } from "@/lib/api/errors";
import { getProjectOrThrow } from "@/lib/services/projects";
import { listImages } from "@/lib/services/images";
import { toProjectDetailData } from "@/lib/serializers/project";
import { toImageSummary } from "@/lib/serializers/image";
import { buildReportData } from "@/lib/services/report-builder";
import type { ReportData } from "@/lib/reports/types";
import type { GenerateReportInput } from "@/lib/validation/report";

export function listReports(projectId: string) {
  return prisma.report
    .findMany({
      where: { projectId },
      orderBy: { generatedAt: "desc" },
      include: { project: { select: { id: true, name: true } } },
    })
    .then(async (reports) => {
      // Fail fast with a clear NOT_FOUND if the project itself doesn't
      // exist, rather than silently returning an empty list either way.
      if (reports.length === 0) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw notFound("Project", projectId);
      }
      return reports;
    });
}

/**
 * All reports across every project, for the top-level /reports page. Joins
 * in just the project name — nothing else — so the list can show which
 * project each report belongs to without a second round-trip per row.
 */
export function listAllReports() {
  return prisma.report.findMany({
    orderBy: { generatedAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
}

export async function getReportById(id: string) {
  const report = await prisma.report.findUnique({
    where: { id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!report) throw notFound("Report", id);
  return report;
}

/**
 * Gathers everything a report needs directly from the database — reusing
 * the exact same services already relied on elsewhere (getProjectOrThrow,
 * listImages) rather than writing new duplicate queries — hands it to the
 * pure report-builder, and persists the resulting snapshot as a new
 * `Report` row. No new Prisma model was introduced: the existing `Report`
 * model's `reportData Json` field is exactly the "structured snapshot"
 * shape this needed (see docs/reporting.md's persistence-decision note).
 */
export async function generateReport(input: GenerateReportInput) {
  const project = await getProjectOrThrow(input.projectId);
  const detail = toProjectDetailData(project);

  const images = (await listImages(input.projectId)).map(toImageSummary);

  // Small, dedicated query for AI-analysis-level context (model version +
  // average confidence across completed analyses) that isn't already
  // exposed by listImages()'s lightweight per-image select. Averaged in
  // JS rather than via Prisma's `.aggregate()` — the sandbox's hand-patched
  // generated client (see docs/ai-pipeline.md) doesn't cover aggregate
  // input types, and re-patching it further isn't warranted for a single
  // average (see the reporting module's explicit rule against unnecessary client
  // patching).
  const completedAnalyses = await prisma.aIAnalysis.findMany({
    where: { status: "COMPLETED", constructionImage: { projectId: input.projectId } },
    orderBy: { createdAt: "desc" },
    select: { modelVersion: true, averageConfidence: true },
  });
  const confidenceValues = completedAnalyses
    .map((analysis) => analysis.averageConfidence)
    .filter((value): value is number => value !== null && value !== undefined);
  const aiAverageConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
      : null;
  const aiModelVersion = completedAnalyses[0]?.modelVersion ?? null;

  const reportData: ReportData = buildReportData({
    project: {
      name: detail.name,
      description: detail.description,
      location: detail.location,
      status: detail.status,
      startDate: detail.startDate,
      expectedEndDate: detail.expectedEndDate,
    },
    records: detail.progressRecords,
    images,
    aiModelVersion,
    aiAverageConfidence,
  });

  return prisma.report.create({
    data: {
      projectId: input.projectId,
      title: reportData.header.reportTitle,
      // reportData is already fully JSON-serializable (all dates are ISO
      // strings) — this cast mirrors the one already used elsewhere in
      // this file for Prisma's stricter InputJsonValue type.
      reportData: reportData as unknown as Prisma.InputJsonValue,
    },
    include: { project: { select: { id: true, name: true } } },
  });
}
