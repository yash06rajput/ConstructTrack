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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient, ApiClientError } from "@/lib/api/client";
import { PROJECT_STATUS_VALUES } from "@/lib/validation/project";
import { PROJECT_STATUS_META } from "@/lib/constants/status";
import type { ProjectSummary } from "@/lib/serializers/project";

const formSchema = z
  .object({
    name: z.string().trim().min(2, "Project name must be at least 2 characters.").max(150),
    description: z.string().trim().max(2000).optional(),
    location: z.string().trim().max(255).optional(),
    status: z.enum(PROJECT_STATUS_VALUES),
    startDate: z.string().min(1, "Start date is required."),
    expectedEndDate: z.string().min(1, "Expected end date is required."),
  })
  .refine((data) => data.expectedEndDate >= data.startDate, {
    message: "Expected end date must be on or after the start date.",
    path: ["expectedEndDate"],
  });

type FormValues = z.infer<typeof formSchema>;

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  project?: ProjectSummary;
  onSaved: (project: { id: string }) => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  mode,
  project,
  onSaved,
}: ProjectFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      status: "PLANNING",
      startDate: "",
      expectedEndDate: "",
    },
  });

  // Reset the form whenever the dialog is (re)opened, so stale edits from a
  // previous open don't linger and edit-mode always reflects the current project.
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && project) {
      reset({
        name: project.name,
        description: project.description ?? "",
        location: project.location ?? "",
        status: project.status,
        startDate: toDateInputValue(project.startDate),
        expectedEndDate: toDateInputValue(project.expectedEndDate),
      });
    } else {
      reset({
        name: "",
        description: "",
        location: "",
        status: "PLANNING",
        startDate: "",
        expectedEndDate: "",
      });
    }
  }, [open, mode, project, reset]);

  const status = watch("status");

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      if (mode === "create") {
        const created = await apiClient.post<{ id: string }>("/api/projects", values);
        toast.success("Project created", {
          description: `"${values.name}" is ready to be monitored.`,
        });
        onSaved(created);
      } else if (project) {
        const updated = await apiClient.patch<{ id: string }>(
          `/api/projects/${project.id}`,
          values,
        );
        toast.success("Project updated", {
          description: `Changes to "${values.name}" were saved.`,
        });
        onSaved(updated);
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Something went wrong while saving the project.";
      toast.error(mode === "create" ? "Could not create project" : "Could not save changes", {
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
          <DialogTitle>{mode === "create" ? "Create project" : "Edit project"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new construction project to start tracking its progress."
              : "Update this project's details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              placeholder="e.g. Commercial Office Building"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the project scope"
              rows={3}
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. Sector 62, Noida"
              aria-invalid={!!errors.location}
              {...register("location")}
            />
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                aria-invalid={!!errors.startDate}
                {...register("startDate")}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="expectedEndDate">Expected end date</Label>
              <Input
                id="expectedEndDate"
                type="date"
                aria-invalid={!!errors.expectedEndDate}
                {...register("expectedEndDate")}
              />
              {errors.expectedEndDate && (
                <p className="text-sm text-destructive">{errors.expectedEndDate.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setValue("status", value as FormValues["status"])}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PROJECT_STATUS_META[value].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create project"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
