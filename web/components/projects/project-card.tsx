"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProgressStatusBadge, ProjectStatusBadge } from "@/components/projects/status-badge";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { formatDate, formatPercent } from "@/lib/format";
import type { ProjectSummary } from "@/lib/serializers/project";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const completion = project.latestProgress?.actualProgress ?? null;

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex-row items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/projects/${project.id}`}
              className="line-clamp-1 text-base font-semibold tracking-tight hover:underline"
            >
              {project.name}
            </Link>
            {project.location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                <span className="line-clamp-1">{project.location}</span>
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0" aria-label="Project actions">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}`}>View details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            {project.latestProgress?.status && (
              <ProgressStatusBadge status={project.latestProgress.status} />
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            <span>
              {formatDate(project.startDate)} &rarr; {formatDate(project.expectedEndDate)}
            </span>
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">Current completion</span>
              <span className="font-medium">{formatPercent(completion)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${Math.min(100, Math.max(0, completion ?? 0))}%` }}
              />
            </div>
            {!project.latestProgress && (
              <p className="mt-1 text-xs text-muted-foreground">No progress recorded yet</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="justify-between text-xs text-muted-foreground">
          <span>{project.progressRecordsCount} progress record{project.progressRecordsCount === 1 ? "" : "s"}</span>
          <span>Updated {formatDate(project.updatedAt)}</span>
        </CardFooter>
      </Card>

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
        onDeleted={() => router.refresh()}
      />
    </>
  );
}
