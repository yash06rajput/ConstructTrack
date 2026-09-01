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
import { formatDate } from "@/lib/format";

interface DeleteProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  recordDate: string;
  onDeleted: (id: string) => void;
}

export function DeleteProgressDialog({
  open,
  onOpenChange,
  recordId,
  recordDate,
  onDeleted,
}: DeleteProgressDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiClient.delete(`/api/progress/${recordId}`);
      toast.success("Progress update deleted");
      onOpenChange(false);
      onDeleted(recordId);
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : "Could not delete this progress update.";
      toast.error("Delete failed", { description: message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete progress update for {formatDate(recordDate)}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This planned-vs-actual record will be permanently
            removed from this project&apos;s history.
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
            {deleting ? "Deleting..." : "Delete update"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
