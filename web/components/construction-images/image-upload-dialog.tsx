"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUploadItem } from "@/components/construction-images/image-upload-item";
import { apiClient, ApiClientError } from "@/lib/api/client";
import { ACCEPTED_IMAGE_INPUT_ACCEPT } from "@/lib/images/constants";
import { createUploadQueueItem, runWithConcurrency, type UploadQueueItem } from "@/lib/images/upload-queue";
import type { ConstructionImageSummary } from "@/lib/serializers/image";

const UPLOAD_CONCURRENCY = 3;

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onUploaded: (images: ConstructionImageSummary[]) => void;
}

export function ImageUploadDialog({
  open,
  onOpenChange,
  projectId,
  onUploaded,
}: ImageUploadDialogProps) {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingCount = items.filter((i) => i.status === "waiting" || i.status === "failed").length;
  const uploadedCount = items.filter((i) => i.status === "uploaded").length;

  const progress = useMemo(() => {
    if (items.length === 0) return 0;
    const settled = items.filter((i) => i.status === "uploaded").length;
    return Math.round((settled / items.length) * 100);
  }, [items]);

  function resetAndClose() {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setUploading(false);
    onOpenChange(false);
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const newItems = Array.from(fileList).map(createUploadQueueItem);
    setItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  async function handleUpload() {
    const toUpload = items.filter((i) => i.status === "waiting" || i.status === "failed");
    if (toUpload.length === 0) return;

    setUploading(true);
    setItems((prev) =>
      prev.map((item) =>
        toUpload.some((t) => t.id === item.id)
          ? { ...item, status: "uploading", error: undefined }
          : item,
      ),
    );

    const uploaded: ConstructionImageSummary[] = [];

    await runWithConcurrency(toUpload, UPLOAD_CONCURRENCY, async (item) => {
      try {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("projectId", projectId);
        const image = await apiClient.postFormData<ConstructionImageSummary>(
          "/api/images",
          formData,
        );
        uploaded.push(image);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "uploaded" } : i)),
        );
      } catch (error) {
        const message =
          error instanceof ApiClientError ? error.message : "Upload failed. Please try again.";
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "failed", error: message } : i)),
        );
      }
    });

    setUploading(false);

    if (uploaded.length > 0) {
      onUploaded(uploaded);
    }

    const failedCount = toUpload.length - uploaded.length;
    if (failedCount === 0) {
      toast.success(
        uploaded.length === 1 ? "1 image uploaded" : `${uploaded.length} images uploaded`,
      );
      resetAndClose();
    } else if (uploaded.length === 0) {
      toast.error("Upload failed", {
        description: `${failedCount} image${failedCount === 1 ? "" : "s"} could not be uploaded. Fix the issue and try again.`,
      });
    } else {
      toast.warning("Some images could not be uploaded", {
        description: `${uploaded.length} succeeded, ${failedCount} failed. You can retry the failed ones below.`,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!uploading ? (next ? onOpenChange(next) : resetAndClose()) : null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload construction images</DialogTitle>
          <DialogDescription>
            Select one or more site photos (JPEG, PNG, or WEBP — up to 10 MB each).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
            className="hidden"
            onChange={(event) => handleFilesSelected(event.target.files)}
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-fit"
          >
            <Upload /> Select images
          </Button>

          {items.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                {uploading
                  ? `Uploading ${uploadedCount} of ${items.length}...`
                  : `${items.length} image${items.length === 1 ? "" : "s"} selected`}
              </p>

              {uploading && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                {items.map((item) => (
                  <ImageUploadItem
                    key={item.id}
                    item={item}
                    onRemove={() => removeItem(item.id)}
                    removable={!uploading && item.status !== "uploaded"}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={resetAndClose} disabled={uploading}>
            {uploadedCount > 0 && uploadedCount === items.length ? "Done" : "Cancel"}
          </Button>
          <Button type="button" onClick={handleUpload} disabled={uploading || pendingCount === 0}>
            {uploading
              ? "Uploading..."
              : `Upload ${pendingCount} image${pendingCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
