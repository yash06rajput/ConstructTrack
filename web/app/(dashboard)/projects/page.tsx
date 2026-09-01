import { listProjects } from "@/lib/services/projects";
import { toProjectSummary } from "@/lib/serializers/project";
import { ProjectsPageClient } from "@/components/projects/projects-page-client";

// Always fetch fresh project data — this is a management workspace, not a
// marketing page, so cached/stale data would be actively misleading.
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();
  const summaries = projects.map(toProjectSummary);

  return <ProjectsPageClient projects={summaries} />;
}
