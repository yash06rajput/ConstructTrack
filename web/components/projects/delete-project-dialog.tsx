"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiClient, ApiClientError } from "@/lib/api/client";

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  dependentCounts: { progressRecords: number; images: number; reports: number };
  onDeleted: () => void;
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  dependentCounts,
  onDeleted,
}: DeleteProjectDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const hasDependents =
    dependentCounts.progressRecords > 0 || dependentCounts.images > 0 || dependentCounts.reports > 0;

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiClient.delete(`/api/projects/${projectId}`);
      toast.success("Project deleted", {
        description: `"${projectName}" and its associated data have been removed.`,
      });
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : "Could not delete this project.";
      toast.error("Delete failed", { description: message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{projectName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>This action cannot be undone. This will permanently delete the project.</p>
              {hasDependents && (
                <p>
                  It will also permanently delete{" "}
                  <span className="font-medium text-foreground">
                    {dependentCounts.progressRecords} progress record
                    {dependentCounts.progressRecords === 1 ? "" : "s"},{" "}
                    {dependentCounts.images} image{dependentCounts.images === 1 ? "" : "s"}, and{" "}
                    {dependentCounts.reports} report{dependentCounts.reports === 1 ? "" : "s"}
                  </span>{" "}
                  associated with it.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting..." : "Delete project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
