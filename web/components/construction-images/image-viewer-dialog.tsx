"use client";

import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AnalysisStatus } from "@prisma/client";

import { AnalysisStatusBadge } from "@/components/projects/status-badge";
import { ImageAnalysisPanel } from "@/components/construction-images/image-analysis-panel";
import { formatDateTime, formatFileSize } from "@/lib/format";
import type { ConstructionImageSummary } from "@/lib/serializers/image";

export function ImageViewerDialog({
  image,
  projectName,
  onOpenChange,
  onStatusChange,
}: {
  image: ConstructionImageSummary | null;
  projectName: string;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (imageId: string, status: AnalysisStatus) => void;
}) {
  return (
    <Dialog open={image !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{image?.originalFilename}</DialogTitle>
        </DialogHeader>

        {image && (
          <div className="flex flex-col gap-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
              <Image
                src={image.imageUrl}
                alt={image.originalFilename}
                fill
                sizes="(min-width: 640px) 768px, 100vw"
                className="object-contain"
                unoptimized
              />
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Project</dt>
                <dd className="mt-0.5 font-medium">{projectName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Uploaded</dt>
                <dd className="mt-0.5 font-medium">{formatDateTime(image.uploadedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">File size</dt>
                <dd className="mt-0.5 font-medium">{formatFileSize(image.fileSizeBytes)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">AI analysis</dt>
                <dd className="mt-0.5">
                  <AnalysisStatusBadge status={image.analysisStatus} />
                </dd>
              </div>
            </dl>

            <ImageAnalysisPanel image={image} onStatusChange={onStatusChange} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
