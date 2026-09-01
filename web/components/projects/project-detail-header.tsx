"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { formatDate } from "@/lib/format";
import type { ProjectDetailData } from "@/lib/serializers/project";

export function ProjectDetailHeader({ project }: { project: ProjectDetailData }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/projects"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to projects
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {project.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {project.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {formatDate(project.startDate)} &rarr; {formatDate(project.expectedEndDate)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 /> Delete
          </Button>
        </div>
      </div>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        project={project}
        onSaved={() => router.refresh()}
      />
      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectId={project.id}
        projectName={project.name}
        dependentCounts={{
          progressRecords: project.progressRecordsCount,
          images: project.imagesCount,
          reports: project.reportsCount,
        }}
        onDeleted={() => router.push("/projects")}
      />
    </div>
  );
}
