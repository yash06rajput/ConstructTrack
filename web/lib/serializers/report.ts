import type { ReportData } from "@/lib/reports/types";

/**
 * Plain, JSON-serializable shapes for the `Report` model. `reportData` is
 * stored as Prisma `Json`, so it comes back as `unknown` — these casts are
 * the same "already round-tripped through JSON" pattern used by
 * lib/services/reports.ts when writing it, and are safe because every
 * report is always built by buildReportData() (see report-builder.ts),
 * never client-supplied.
 */
export interface ReportListItem {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  generatedAt: string;
}

export interface ReportDetail extends ReportListItem {
  data: ReportData;
}

interface SerializableReport {
  id: string;
  projectId: string;
  title: string;
  generatedAt: Date;
  reportData: unknown;
  project: { id: string; name: string };
}

export function toReportListItem(report: Omit<SerializableReport, "reportData">): ReportListItem {
  return {
    id: report.id,
    projectId: report.projectId,
    projectName: report.project.name,
    title: report.title,
    generatedAt: report.generatedAt.toISOString(),
  };
}

export function toReportDetail(report: SerializableReport): ReportDetail {
  return {
    ...toReportListItem(report),
    data: report.reportData as ReportData,
  };
}
