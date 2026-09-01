import type { ProgressStatus, ProjectStatus } from "@prisma/client";

import type { ProjectDetail, ProjectListItem } from "@/lib/services/projects";

/**
 * Plain, JSON-serializable shapes for passing Prisma query results from
 * Server Components down to Client Components (dates become ISO strings
 * explicitly, rather than relying on the RSC payload's Date handling).
 */

export interface ProgressSnapshot {
  id: string;
  recordDate: string;
  plannedProgress: number;
  actualProgress: number | null;
  deviation: number | null;
  status: ProgressStatus | null;
  notes: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: ProjectStatus;
  startDate: string;
  expectedEndDate: string;
  createdAt: string;
  updatedAt: string;
  progressRecordsCount: number;
  imagesCount: number;
  reportsCount: number;
  latestProgress: ProgressSnapshot | null;
}

export interface ProjectDetailData extends Omit<ProjectSummary, "latestProgress"> {
  progressRecords: ProgressSnapshot[];
  latestProgress: ProgressSnapshot | null;
}

function toProgressSnapshot(record: {
  id: string;
  recordDate: Date;
  plannedProgress: number;
  actualProgress: number | null;
  deviation: number | null;
  status: ProgressStatus | null;
  notes: string | null;
}): ProgressSnapshot {
  return {
    id: record.id,
    recordDate: record.recordDate.toISOString(),
    plannedProgress: record.plannedProgress,
    actualProgress: record.actualProgress,
    deviation: record.deviation,
    status: record.status,
    notes: record.notes,
  };
}

export function toProjectSummary(project: ProjectListItem): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    location: project.location,
    status: project.status,
    startDate: project.startDate.toISOString(),
    expectedEndDate: project.expectedEndDate.toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    progressRecordsCount: project._count.progressRecords,
    imagesCount: project._count.images,
    reportsCount: project._count.reports,
    latestProgress: project.progressRecords[0]
      ? toProgressSnapshot(project.progressRecords[0])
      : null,
  };
}

export function toProjectDetailData(project: ProjectDetail): ProjectDetailData {
  const progressRecords = project.progressRecords.map(toProgressSnapshot);
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    location: project.location,
    status: project.status,
    startDate: project.startDate.toISOString(),
    expectedEndDate: project.expectedEndDate.toISOString(),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    progressRecordsCount: progressRecords.length,
    imagesCount: project._count.images,
    reportsCount: project._count.reports,
    progressRecords,
    latestProgress: progressRecords.length > 0 ? progressRecords[progressRecords.length - 1] : null,
  };
}
