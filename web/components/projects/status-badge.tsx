import type { AnalysisStatus, ProgressStatus, ProjectStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { ANALYSIS_STATUS_META, PROGRESS_STATUS_META, PROJECT_STATUS_META } from "@/lib/constants/status";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const meta = PROJECT_STATUS_META[status];
  return <Badge variant={meta.badgeVariant}>{meta.label}</Badge>;
}

export function ProgressStatusBadge({ status }: { status: ProgressStatus }) {
  const meta = PROGRESS_STATUS_META[status];
  return <Badge variant={meta.badgeVariant}>{meta.label}</Badge>;
}

export function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const meta = ANALYSIS_STATUS_META[status];
  return <Badge variant={meta.badgeVariant}>{meta.label}</Badge>;
}
