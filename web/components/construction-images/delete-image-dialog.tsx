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
import type { DeleteImageResult } from "@/lib/services/images";

interface DeleteImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageId: string;
  filename: string;
  onDeleted: (imageId: string) => void;
}

export function DeleteImageDialog({
  open,
  onOpenChange,
  imageId,
  filename,
  onDeleted,
}: DeleteImageDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await apiClient.delete<DeleteImageResult>(`/api/images/${imageId}`);
      onOpenChange(false);
      onDeleted(imageId);
      if (result.storageCleanupFailed) {
        toast.warning("Image removed", {
          description:
            "The image record was deleted, but its storage file could not be removed automatically.",
        });
      } else {
        toast.success("Image deleted");
      }
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Could not delete this image.";
      toast.error("Delete failed", { description: message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this image?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{filename}&quot; will be permanently deleted from storage. This cannot be undone.
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
            {deleting ? "Deleting..." : "Delete image"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
