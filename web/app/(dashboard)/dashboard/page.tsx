import Link from "next/link";
import { AlertTriangle, Building2, ListChecks, TrendingUp } from "lucide-react";

import { getDashboardStats } from "@/lib/services/dashboard";
import { listProjects } from "@/lib/services/projects";
import { toProjectSummary } from "@/lib/serializers/project";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { ProjectsEmptyState } from "@/components/projects/projects-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, projects] = await Promise.all([getDashboardStats(), listProjects()]);
  const summaries = projects.map(toProjectSummary).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Project health and progress overview, from live project data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Total projects" value={String(stats.totalProjects)} />
        <StatCard icon={ListChecks} label="Active projects" value={String(stats.activeProjects)} />
        <StatCard
          icon={TrendingUp}
          label="Average completion"
          value={formatPercent(stats.averageCompletion)}
          hint={
            stats.projectsWithoutProgressData > 0
              ? `${stats.projectsWithoutProgressData} project${stats.projectsWithoutProgressData === 1 ? "" : "s"} without progress data yet`
              : undefined
          }
        />
        <StatCard
          icon={AlertTriangle}
          label="Projects at risk"
          value={String(stats.atRiskProjects)}
          hint="Based on latest recorded progress vs. plan"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent projects</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <ProjectsEmptyState
              title="No projects yet"
              description="Create your first construction project to begin monitoring progress."
              action={
                <Button asChild>
                  <Link href="/projects">Create your first project</Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                          {project.name}
                        </Link>
                        {project.location && (
                          <p className="text-xs text-muted-foreground">{project.location}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <ProjectStatusBadge status={project.status} />
                      </TableCell>
                      <TableCell>{formatPercent(project.latestProgress?.actualProgress ?? null)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(project.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
