import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { ProjectDetailData } from "@/lib/serializers/project";

export function ProjectInfoCard({ project }: { project: ProjectDetailData }) {
  const fields = [
    { label: "Location", value: project.location ?? "Not specified" },
    { label: "Start date", value: formatDate(project.startDate) },
    { label: "Expected end date", value: formatDate(project.expectedEndDate) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project information</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Description</p>
          <p className="mt-1 text-sm">
            {project.description || "No description provided."}
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="mt-0.5 text-sm font-medium">{field.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
