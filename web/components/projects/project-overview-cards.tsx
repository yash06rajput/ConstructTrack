import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressStatusBadge, ProjectStatusBadge } from "@/components/projects/status-badge";
import { formatPercent, formatSignedPercent } from "@/lib/format";
import type { ProjectDetailData } from "@/lib/serializers/project";

export function ProjectOverviewCards({ project }: { project: ProjectDetailData }) {
  const latest = project.latestProgress;

  const cards = [
    {
      title: "Current completion",
      value: formatPercent(latest?.actualProgress ?? null),
      hint: latest ? "From latest progress record" : "No progress recorded yet",
    },
    {
      title: "Planned completion",
      value: formatPercent(latest?.plannedProgress ?? null),
      hint: latest ? "Expected as of the latest record" : "—",
    },
    {
      title: "Schedule deviation",
      value: formatSignedPercent(latest?.deviation ?? null),
      hint: latest ? "Actual vs. planned" : "—",
      valueClassName:
        latest?.deviation !== null && latest?.deviation !== undefined
          ? latest.deviation < 0
            ? "text-destructive"
            : "text-success"
          : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${card.valueClassName ?? ""}`}>{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Project status
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <ProjectStatusBadge status={project.status} />
          {latest?.status && <ProgressStatusBadge status={latest.status} />}
        </CardContent>
      </Card>
    </div>
  );
}
