import { prisma } from "@/lib/db";

/**
 * Dashboard summary stats, computed directly from real data.
 *
 * "At risk" here is intentionally based on the latest ProgressRecord's
 * `status` (AT_RISK / DELAYED — a simple planned-vs-actual comparison),
 * NOT on DelayPrediction/RiskLevel. Delay prediction is a separate,
 * not-yet-surfaced-in-the-UI feature; conflating the two would overstate
 * what this dashboard currently does.
 */
export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  averageCompletion: number | null;
  atRiskProjects: number;
  projectsWithoutProgressData: number;
}

interface ProjectRiskRow {
  id: string;
  status: string;
  progressRecords: Array<{ actualProgress: number | null; status: string | null }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const projects: ProjectRiskRow[] = await prisma.project.findMany({
    select: {
      id: true,
      status: true,
      progressRecords: {
        orderBy: { recordDate: "desc" },
        take: 1,
        select: { actualProgress: true, status: true },
      },
    },
  });

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "IN_PROGRESS").length;

  const latestSnapshots = projects
    .map((p) => p.progressRecords[0])
    .filter((snapshot): snapshot is ProjectRiskRow["progressRecords"][number] => Boolean(snapshot));

  const completionValues = latestSnapshots
    .map((record) => record.actualProgress)
    .filter((value): value is number => typeof value === "number");

  const averageCompletion =
    completionValues.length > 0
      ? Math.round(
          (completionValues.reduce((sum, value) => sum + value, 0) / completionValues.length) * 10,
        ) / 10
      : null;

  const atRiskProjects = latestSnapshots.filter(
    (record) => record.status === "AT_RISK" || record.status === "DELAYED",
  ).length;

  return {
    totalProjects,
    activeProjects,
    averageCompletion,
    atRiskProjects,
    projectsWithoutProgressData: totalProjects - latestSnapshots.length,
  };
}
