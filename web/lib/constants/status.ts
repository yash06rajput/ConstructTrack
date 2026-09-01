import type { AnalysisStatus, ProgressStatus, ProjectStatus } from "@prisma/client";

/**
 * Single source of truth for how each Prisma enum value is labeled and
 * colored in the UI. Keeps status presentation consistent across the
 * projects list, project detail page, and dashboard.
 */
export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; badgeVariant: "default" | "secondary" | "outline" | "warning" | "destructive" | "success" }
> = {
  PLANNING: { label: "Planning", badgeVariant: "outline" },
  IN_PROGRESS: { label: "Active", badgeVariant: "default" },
  ON_HOLD: { label: "On Hold", badgeVariant: "secondary" },
  DELAYED: { label: "Delayed", badgeVariant: "destructive" },
  COMPLETED: { label: "Completed", badgeVariant: "success" },
};

export const PROGRESS_STATUS_META: Record<
  ProgressStatus,
  { label: string; badgeVariant: "default" | "secondary" | "outline" | "warning" | "destructive" | "success" }
> = {
  AHEAD: { label: "Ahead of schedule", badgeVariant: "success" },
  ON_TRACK: { label: "On track", badgeVariant: "default" },
  AT_RISK: { label: "At risk", badgeVariant: "warning" },
  DELAYED: { label: "Delayed", badgeVariant: "destructive" },
};

export const ANALYSIS_STATUS_META: Record<
  AnalysisStatus,
  { label: string; badgeVariant: "default" | "secondary" | "outline" | "warning" | "destructive" | "success" }
> = {
  PENDING: { label: "Pending", badgeVariant: "outline" },
  PROCESSING: { label: "Processing", badgeVariant: "secondary" },
  COMPLETED: { label: "Completed", badgeVariant: "success" },
  FAILED: { label: "Failed", badgeVariant: "destructive" },
};
