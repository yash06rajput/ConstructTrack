"use client";

import Image from "next/image";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/format";
import type { UploadQueueItem } from "@/lib/images/upload-queue";

const STATUS_LABEL: Record<UploadQueueItem["status"], string> = {
  waiting: "Waiting",
  uploading: "Uploading...",
  uploaded: "Uploaded",
  failed: "Failed",
};

export function ImageUploadItem({
  item,
  onRemove,
  removable,
}: {
  item: UploadQueueItem;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-2">
      <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
        <Image
          src={item.previewUrl}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
          unoptimized
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
        {item.error && <p className="mt-0.5 text-xs text-destructive">{item.error}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`flex items-center gap-1 text-xs ${
            item.status === "failed"
              ? "text-destructive"
              : item.status === "uploaded"
                ? "text-success"
                : "text-muted-foreground"
          }`}
        >
          {item.status === "uploading" && <Loader2 className="size-3.5 animate-spin" />}
          {item.status === "uploaded" && <CheckCircle2 className="size-3.5" />}
          {item.status === "failed" && <AlertCircle className="size-3.5" />}
          {STATUS_LABEL[item.status]}
        </span>
        {removable && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onRemove}
            aria-label={`Remove ${item.file.name}`}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
