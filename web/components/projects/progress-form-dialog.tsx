"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, ApiClientError } from "@/lib/api/client";
import type { ProgressSnapshot } from "@/lib/serializers/project";

/**
 * Mirrors lib/validation/progress.ts's server-side bounds (0-100 for both
 * progress fields) — this is UX-only; the server re-validates identically
 * and is the actual authority (see createProgressRecordSchema /
 * updateProgressRecordSchema).
 */
const formSchema = z.object({
  recordDate: z.string().min(1, "Progress date is required."),
  plannedProgress: z
    .string()
    .min(1, "Planned progress is required.")
    .refine((value) => !Number.isNaN(Number(value)), "Must be a number.")
    .refine((value) => Number(value) >= 0 && Number(value) <= 100, "Must be between 0 and 100."),
  actualProgress: z
    .string()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), "Must be a number.")
    .refine(
      (value) => value === "" || (Number(value) >= 0 && Number(value) <= 100),
      "Must be between 0 and 100.",
    )
    .optional(),
  notes: z.string().trim().max(2000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProgressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  mode: "create" | "edit";
  record?: ProgressSnapshot;
  onSaved: (record: ProgressSnapshot) => void;
}

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export function ProgressFormDialog({
  open,
  onOpenChange,
  projectId,
  mode,
  record,
  onSaved,
}: ProgressFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { recordDate: "", plannedProgress: "", actualProgress: "", notes: "" },
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && record) {
      reset({
        recordDate: toDateInputValue(record.recordDate),
        plannedProgress: String(record.plannedProgress),
        actualProgress: record.actualProgress !== null ? String(record.actualProgress) : "",
        notes: record.notes ?? "",
      });
    } else {
      reset({ recordDate: "", plannedProgress: "", actualProgress: "", notes: "" });
    }
  }, [open, mode, record, reset]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const payload = {
      recordDate: values.recordDate,
      plannedProgress: Number(values.plannedProgress),
      actualProgress: values.actualProgress === "" || values.actualProgress === undefined
        ? undefined
        : Number(values.actualProgress),
      notes: values.notes === "" ? undefined : values.notes,
    };

    try {
      if (mode === "create") {
        const created = await apiClient.post<ProgressSnapshot>("/api/progress", {
          projectId,
          ...payload,
        });
        toast.success("Progress update added");
        onSaved(created);
      } else if (record) {
        const updated = await apiClient.patch<ProgressSnapshot>(`/api/progress/${record.id}`, {
          ...payload,
          // An explicit clear (user erased the field) must send `null`,
          // not be dropped — `undefined` above means "leave unchanged".
          actualProgress: values.actualProgress === "" ? null : Number(values.actualProgress),
          notes: values.notes === "" ? null : values.notes,
        });
        toast.success("Progress update saved");
        onSaved(updated);
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : "Something went wrong while saving.";
      toast.error(mode === "create" ? "Could not add progress update" : "Could not save changes", {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add progress update" : "Edit progress update"}</DialogTitle>
          <DialogDescription>
            Record planned vs. actual completion for a specific date. Leave actual progress blank
            if it hasn&apos;t been measured yet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="recordDate">Progress date</Label>
            <Input
              id="recordDate"
              type="date"
              aria-invalid={!!errors.recordDate}
              {...register("recordDate")}
            />
            {errors.recordDate && (
              <p className="text-sm text-destructive">{errors.recordDate.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plannedProgress">Planned progress (%)</Label>
              <Input
                id="plannedProgress"
                type="number"
                min={0}
                max={100}
                step="0.1"
                placeholder="e.g. 70"
                aria-invalid={!!errors.plannedProgress}
                {...register("plannedProgress")}
              />
              {errors.plannedProgress && (
                <p className="text-sm text-destructive">{errors.plannedProgress.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="actualProgress">Actual progress (%)</Label>
              <Input
                id="actualProgress"
                type="number"
                min={0}
                max={100}
                step="0.1"
                placeholder="e.g. 64"
                aria-invalid={!!errors.actualProgress}
                {...register("actualProgress")}
              />
              {errors.actualProgress && (
                <p className="text-sm text-destructive">{errors.actualProgress.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional context — e.g. weather delays, material shortage, milestone reached"
              rows={3}
              aria-invalid={!!errors.notes}
              {...register("notes")}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : mode === "create"
                  ? "Save progress"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
