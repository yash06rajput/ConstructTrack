import { listProjects } from "@/lib/services/projects";
import { listAllReports } from "@/lib/services/reports";
import { toReportListItem } from "@/lib/serializers/report";
import { GenerateReportControl } from "@/components/reports/generate-report-control";
import { ReportsTable } from "@/components/reports/reports-table";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [projects, reports] = await Promise.all([listProjects(), listAllReports()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Structured, printable construction progress &amp; risk reports, generated from real project data.
        </p>
      </div>

      <GenerateReportControl projects={projects.map((project) => ({ id: project.id, name: project.name }))} />

      <ReportsTable reports={reports.map(toReportListItem)} />
    </div>
  );
}
