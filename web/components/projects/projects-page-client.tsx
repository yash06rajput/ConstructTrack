"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectsEmptyState } from "@/components/projects/projects-empty-state";
import { PROJECT_STATUS_VALUES } from "@/lib/validation/project";
import { PROJECT_STATUS_META } from "@/lib/constants/status";
import type { ProjectSummary } from "@/lib/serializers/project";

const STATUS_FILTER_ALL = "ALL";

export function ProjectsPageClient({ projects }: { projects: ProjectSummary[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [createOpen, setCreateOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch =
        query.length === 0 ||
        project.name.toLowerCase().includes(query) ||
        (project.location ?? "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === STATUS_FILTER_ALL || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage the construction projects you&apos;re monitoring.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> Create project
        </Button>
      </div>

      {projects.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects by name or location..."
              className="pl-9"
              aria-label="Search projects"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
              {PROJECT_STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {PROJECT_STATUS_META[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {projects.length === 0 ? (
        <ProjectsEmptyState
          title="No projects yet"
          description="Create your first construction project to begin monitoring progress."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Create your first project
            </Button>
          }
        />
      ) : filteredProjects.length === 0 ? (
        <ProjectsEmptyState
          title="No matching projects"
          description="Try a different search term or clear the status filter."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSaved={(created) => {
          router.refresh();
          router.push(`/projects/${created.id}`);
        }}
      />
    </div>
  );
}
